/*
 * Larpcord, a standalone Discord client for local cosmetic larping
 * Copyright (c) 2026 Larpcord contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import * as DataStore from "@api/DataStore";
import { fromSharedProfile, toSharedProfile } from "@plugins/larpCore/shared";
import { getSelfId, LarpStore, logger, RemoteProfiles } from "@plugins/larpCore/store";
import { useEffect, useReducer,UserProfileStore } from "@webpack/common";

import type { LarpSyncLoginResult, LarpSyncStatus } from "./types";

/*
 * Larp sync engine.
 *
 * Sharing: the shared part of the active larp account (larpCore/shared.ts) is uploaded a few seconds after it
 * changes, as long as sharing is on, someone is logged in and the login matches the Discord account that is
 * open right now. On the real profile or with sharing off, the shared profile is deleted on the server.
 *
 * Viewing: the server's index (user ID → version) is loaded on start and every few minutes. A listed user's
 * profile is only downloaded when Discord shows that user (RemoteProfiles requester), in small batches.
 * Received profiles are sanitized again (fromSharedProfile) and only ever reach display copies.
 */

const SETTINGS_KEY = "Larpcord_sync";
const UPLOAD_DELAY_MS = 4000;
const INDEX_INTERVAL_MS = 5 * 60 * 1000;
const RETRY_FAILED_MS = 10 * 60 * 1000;
const BATCH_DELAY_MS = 250;
const BATCH_SIZE = 50;

export interface SyncSettings {
    /** Share the own larp profile (needs a sync login). Default: on */
    share: boolean;
    /** Show other Larpcord users' larp profiles. Default: on */
    view: boolean;
    /** Users whose real profile the viewer chose to see */
    showReal: string[];
}

const native = () => (IS_VESKTOP ? VesktopNative?.larpcord?.sync : undefined) as undefined | {
    status(): Promise<LarpSyncStatus>;
    setUrl(url: string): Promise<{ ok: boolean; value?: LarpSyncStatus; error?: string; }>;
    login(): Promise<LarpSyncLoginResult>;
    cancelLogin(): Promise<void>;
    logout(): Promise<LarpSyncStatus>;
    put(json: string): Promise<{ ok: boolean; value?: number; error?: string; status?: number; }>;
    remove(): Promise<{ ok: boolean; error?: string; status?: number; }>;
    index(etag?: string): Promise<{ ok: boolean; value?: { profiles?: Record<string, number>; etag?: string; }; error?: string; }>;
    profiles(ids: string[]): Promise<{ ok: boolean; value?: Record<string, { version: number; profile: unknown; } | null>; error?: string; }>;
};

export const isSyncAvailable = () => !!native();

// ---- State shown in the hub ----

export type UploadState = "idle" | "uploading" | "shared" | "removed" | "error" | "otherAccount";

let settings: SyncSettings = { share: true, view: true, showReal: [] };
let status: LarpSyncStatus | undefined;
let uploadState: UploadState = "idle";
let lastError: string | undefined;
let sharedCount = 0;
const uiListeners = new Set<() => void>();

function notify() {
    for (const fn of uiListeners) {
        try {
            fn();
        } catch { }
    }
}

export function useSyncState() {
    const [, forceUpdate] = useReducer(x => x + 1, 0);
    useEffect(() => {
        uiListeners.add(forceUpdate);
        return () => void uiListeners.delete(forceUpdate);
    }, []);
    return { settings, status, uploadState, lastError, sharedCount };
}

async function saveSettings() {
    try {
        await DataStore.set(SETTINGS_KEY, settings);
    } catch (e) {
        logger.error("Sync-Einstellungen konnten nicht gespeichert werden", e);
    }
}

// ---- Sharing ----

let uploadTimer: ReturnType<typeof setTimeout> | undefined;
/** What the server has right now: JSON of the shared profile, "" = deleted, undefined = unknown */
let uploaded: string | undefined;

/** JSON to upload, or "" when the profile should not be shared */
function wantedUpload(): string {
    if (!settings.share || LarpStore.isRealProfile) return "";
    return JSON.stringify(toSharedProfile(LarpStore.get()));
}

function scheduleUpload(delay = UPLOAD_DELAY_MS) {
    clearTimeout(uploadTimer);
    uploadTimer = setTimeout(() => void upload(), delay);
}

async function upload() {
    const api = native();
    if (!api || !status?.url || !status.userId) return;
    // Rule 2: only ever share the profile of the Discord account that is open right now
    const selfId = getSelfId();
    if (!selfId) return;
    if (selfId !== status.userId) {
        uploadState = "otherAccount";
        notify();
        return;
    }

    const wanted = wantedUpload();
    if (wanted === uploaded) return;
    uploadState = "uploading";
    notify();
    try {
        const res = wanted ? await api.put(wanted) : await api.remove();
        if (res.ok) {
            uploaded = wanted;
            uploadState = wanted ? "shared" : "removed";
            lastError = undefined;
        } else {
            uploadState = "error";
            lastError = res.error;
            if (res.status === 401) status = await api.status();
            else scheduleUpload(60_000);
        }
    } catch (e) {
        uploadState = "error";
        lastError = String(e);
        scheduleUpload(60_000);
    }
    notify();
}

// ---- Viewing ----

let indexEtag: string | undefined;
let indexVersions: Record<string, number> = {};
const loadedVersions = new Map<string, number>();
const queue = new Set<string>();
const failedAt = new Map<string, number>();
let batchTimer: ReturnType<typeof setTimeout> | undefined;
let indexTimer: ReturnType<typeof setInterval> | undefined;

function request(userId: string) {
    if (queue.has(userId) || !settings.view) return;
    const failed = failedAt.get(userId);
    if (failed && Date.now() - failed < RETRY_FAILED_MS) return;
    queue.add(userId);
    batchTimer ??= setTimeout(() => void flush(), BATCH_DELAY_MS);
}

async function flush() {
    batchTimer = undefined;
    const api = native();
    const ids = [...queue].slice(0, BATCH_SIZE);
    if (!api || !ids.length) return;
    for (const id of ids) queue.delete(id);
    if (queue.size) batchTimer = setTimeout(() => void flush(), BATCH_DELAY_MS);

    try {
        const res = await api.profiles(ids);
        if (!res.ok || !res.value) throw new Error(res.error);
        const entries: Record<string, ReturnType<typeof fromSharedProfile> | null> = {};
        for (const id of ids) {
            const item = res.value[id];
            const profile = item ? fromSharedProfile(id, item.profile) : undefined;
            if (profile && item) {
                loadedVersions.set(id, item.version);
                entries[id] = profile;
            } else {
                // Gone or invalid: don't ask again until the index lists a new version
                loadedVersions.delete(id);
                failedAt.set(id, Date.now());
                entries[id] = null;
            }
        }
        RemoteProfiles.set(entries as Record<string, any>);
        refreshProfiles();
    } catch (e) {
        logger.warn("Larp-Profile konnten nicht geladen werden", e);
        for (const id of ids) failedAt.set(id, Date.now());
    }
}

/** Open profile popouts/modals read the display copy again */
function refreshProfiles() {
    try {
        UserProfileStore.emitChange();
    } catch { }
}

async function loadIndex() {
    const api = native();
    if (!api || !status?.url || !settings.view) return;
    try {
        const res = await api.index(indexEtag);
        if (!res.ok || !res.value) throw new Error(res.error);
        indexEtag = res.value.etag;
        if (!res.value.profiles) return; // 304: nothing changed
        indexVersions = res.value.profiles;
        sharedCount = Object.keys(indexVersions).length;
        // Profiles that changed since they were loaded are fetched again
        for (const [id, version] of loadedVersions) {
            if (indexVersions[id] !== undefined && indexVersions[id] !== version) {
                failedAt.delete(id);
                request(id);
            }
        }
        for (const id of [...failedAt.keys()]) if (indexVersions[id] !== undefined && indexVersions[id] !== loadedVersions.get(id)) failedAt.delete(id);
        RemoteProfiles.setIndex(Object.keys(indexVersions));
        notify();
    } catch (e) {
        logger.warn("Larp-Sync-Index konnte nicht geladen werden", e);
    }
}

function resetViewing() {
    indexEtag = undefined;
    indexVersions = {};
    loadedVersions.clear();
    failedAt.clear();
    queue.clear();
    sharedCount = 0;
    RemoteProfiles.clear();
}

// ---- Lifecycle and hub actions ----

let unsubscribe: (() => void) | undefined;

export async function startSync() {
    try {
        const saved = await DataStore.get<Partial<SyncSettings>>(SETTINGS_KEY);
        if (saved) {
            settings = {
                share: typeof saved.share === "boolean" ? saved.share : true,
                view: typeof saved.view === "boolean" ? saved.view : true,
                showReal: Array.isArray(saved.showReal) ? saved.showReal.filter(id => typeof id === "string").slice(0, 1000) : []
            };
        }
    } catch (e) {
        logger.error("Sync-Einstellungen konnten nicht geladen werden", e);
    }
    RemoteProfiles.setEnabled(settings.view);
    RemoteProfiles.loadShowReal(settings.showReal);
    RemoteProfiles.setRequester(request);

    const api = native();
    if (!api) return;
    try {
        status = await api.status();
    } catch (e) {
        logger.error("Sync-Status nicht verfügbar", e);
        return;
    }
    notify();

    await LarpStore.init();
    let lastWanted = wantedUpload();
    unsubscribe = LarpStore.subscribe(() => {
        const now = wantedUpload();
        if (now === lastWanted) return;
        lastWanted = now;
        scheduleUpload();
    });
    scheduleUpload(2000);

    void loadIndex();
    indexTimer = setInterval(() => void loadIndex(), INDEX_INTERVAL_MS);
}

export function stopSync() {
    unsubscribe?.();
    unsubscribe = undefined;
    clearTimeout(uploadTimer);
    clearTimeout(batchTimer);
    batchTimer = undefined;
    clearInterval(indexTimer);
    RemoteProfiles.setRequester(undefined);
    resetViewing();
}

/** Discord account switched or connection reopened: re-check who may share */
export function onConnectionOpen() {
    uploaded = undefined;
    scheduleUpload(2000);
}

export async function setShare(value: boolean) {
    settings = { ...settings, share: value };
    await saveSettings();
    notify();
    scheduleUpload(0);
}

export async function setView(value: boolean) {
    settings = { ...settings, view: value };
    await saveSettings();
    RemoteProfiles.setEnabled(value);
    if (value) void loadIndex();
    else resetViewing();
    notify();
    refreshProfiles();
}

export async function setShowReal(userId: string, value: boolean) {
    const list = settings.showReal.filter(id => id !== userId);
    if (value) list.push(userId);
    settings = { ...settings, showReal: list };
    RemoteProfiles.setShowReal(userId, value);
    await saveSettings();
    refreshProfiles();
}

export async function login(): Promise<LarpSyncLoginResult> {
    const api = native();
    if (!api) return { ok: false, error: "noServer" };
    status = { ...status!, loggingIn: true };
    notify();
    const res = await api.login();
    status = await api.status();
    uploaded = undefined;
    notify();
    if (res.ok) scheduleUpload(0);
    return res;
}

export async function cancelLogin() {
    await native()?.cancelLogin();
}

export async function logout() {
    const api = native();
    if (!api) return;
    // Logging out stops sharing: remove the profile first
    if (status?.userId && uploaded !== "") await api.remove().catch(() => null);
    status = await api.logout();
    uploaded = undefined;
    uploadState = "idle";
    notify();
}

export async function deleteShared() {
    const api = native();
    if (!api) return;
    const res = await api.remove();
    if (res.ok) {
        uploaded = "";
        uploadState = "removed";
    }
    await setShare(false);
}

export async function setServerUrl(url: string): Promise<string | undefined> {
    const api = native();
    if (!api) return "noServer";
    const res = await api.setUrl(url);
    if (!res.ok) return res.error;
    status = res.value;
    uploaded = undefined;
    resetViewing();
    void loadIndex();
    notify();
    return undefined;
}
