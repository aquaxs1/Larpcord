/*
 * Larpcord, a standalone Discord client for local cosmetic larping
 * Copyright (c) 2026 Larpcord contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import * as DataStore from "@api/DataStore";
import { Logger } from "@utils/Logger";
import { useEffect, useReducer, UserStore } from "@webpack/common";

import { BUILTIN_PRESETS, createDefaultProfile, findBuiltinPreset, isReservedPresetName, LEGACY_BUILTIN_NAMES } from "./defaults";
import { LarpError } from "./i18n";
import { DeepPartial, LarpAccount, LarpPreset, LarpProfile } from "./types";
import { sanitizePreset, sanitizeProfile } from "./validate";

/*
 * Zentraler Larpcord-Store. Alles liegt lokal in Vencords DataStore (IndexedDB im Renderer).
 * Es werden niemals Daten an Discord gesendet.
 */

const STORE_KEY = "Larpcord_state";
export const logger = new Logger("Larpcord", "#eb459e");

/**
 * Stabile Identität eines Presets: "builtin:<id>" für mitgelieferte, "user:<name>" für eigene.
 * Anzeigenamen der mitgelieferten Presets hängen von der Sprache ab und taugen deshalb nicht als Schlüssel.
 */
export type PresetKey = string;

export function userPresetKey(name: string): PresetKey {
    return `user:${name}`;
}

export function presetKey(p: Pick<LarpPreset, "name" | "builtinId">): PresetKey {
    return p.builtinId ? `builtin:${p.builtinId}` : userPresetKey(p.name);
}

/**
 * Interner Speicherstand (nicht das Import/Export-Format).
 * Version 3: larp accounts, each with its own profile. Presets stay shared across accounts.
 * Version 2: activePreset ist ein PresetKey. Version 1 speicherte dort den Namen (auch bei mitgelieferten).
 * Versions 1 and 2 had a single `profile`; it becomes the first larp account.
 */
interface PersistedState {
    version: 3;
    accounts: LarpAccount[];
    /** ID of the active larp account; undefined = real profile (no larp at all) */
    activeAccount?: string;
    /** nur eigene Presets, die mitgelieferten kommen aus BUILTIN_PRESETS */
    presets: LarpPreset[];
    activePreset?: PresetKey;
    /** Show a Discord-style loading screen when switching larp accounts */
    switchAnimation: boolean;
}

export const MAX_ACCOUNTS = 20;

/** Profile used while the real profile is active: nothing larped, read-only */
const REAL_PROFILE: LarpProfile = createDefaultProfile();

function newAccountId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function initialState(profile: LarpProfile = createDefaultProfile()): PersistedState {
    const id = newAccountId();
    return { version: 3, accounts: [{ id, profile }], activeAccount: id, presets: [], switchAnimation: true };
}

let state: PersistedState = initialState();

function activeAccount(): LarpAccount | undefined {
    return state.activeAccount ? state.accounts.find(a => a.id === state.activeAccount) : undefined;
}

/** Writes the profile of the active account. Returns false on the real profile (read-only). */
function setActiveProfile(profile: LarpProfile, activePreset: PresetKey | undefined): boolean {
    const acc = activeAccount();
    if (!acc) {
        logger.warn("Echtes Profil aktiv – Änderung ignoriert. Erst ein Larp-Konto wählen.");
        return false;
    }
    state = { ...state, accounts: state.accounts.map(a => a === acc ? { ...a, profile } : a), activePreset };
    return true;
}

function sanitizeAccounts(v: unknown): LarpAccount[] {
    if (!Array.isArray(v)) return [];
    const seen = new Set<string>();
    const out: LarpAccount[] = [];
    for (const a of v) {
        if (!isPlainObject(a)) continue;
        const id = typeof a.id === "string" ? a.id.replace(/[^\w-]/g, "").slice(0, 40) : "";
        if (!id || seen.has(id)) continue;
        seen.add(id);
        out.push({ id, profile: sanitizeProfile(a.profile) });
        if (out.length >= MAX_ACCOUNTS) break;
    }
    return out;
}
let loaded = false;
let loadPromise: Promise<void> | undefined;
const listeners = new Set<() => void>();

function isPlainObject(v: unknown): v is Record<string, any> {
    return v != null && typeof v === "object" && !Array.isArray(v);
}

function deepMerge<T>(target: T, patch: any): T {
    if (!isPlainObject(patch) || !isPlainObject(target)) return patch as T;
    const out: Record<string, any> = { ...target };
    for (const [k, v] of Object.entries(patch)) {
        if (v === undefined) delete out[k];
        else out[k] = isPlainObject(v) && isPlainObject(out[k]) ? deepMerge(out[k], v) : v;
    }
    return out as T;
}

/** Steigt bei jeder Änderung, damit Hooks ihre Ergebnisse cachen können */
let version = 0;

/** Aktives Preset aus älteren Speicherständen (Version 1: Name) in einen PresetKey umwandeln */
function migrateActivePreset(value: unknown, savedVersion: unknown, presets: LarpPreset[]): PresetKey | undefined {
    if (typeof value !== "string" || !value) return undefined;
    let key: PresetKey = value;
    if (savedVersion !== 2) {
        const builtinId = LEGACY_BUILTIN_NAMES[value];
        key = builtinId ? `builtin:${builtinId}` : userPresetKey(value);
    }
    // Nur behalten, wenn es das Preset noch gibt
    return [...BUILTIN_PRESETS, ...presets].some(p => presetKey(p) === key) ? key : undefined;
}

function emit() {
    version++;
    for (const fn of listeners) {
        try {
            fn();
        } catch (e) {
            logger.error("Listener-Fehler", e);
        }
    }
}

let saveTimer: ReturnType<typeof setTimeout> | undefined;
function persist() {
    // Schreibzugriffe bündeln (z. B. beim Ziehen eines Farbreglers)
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
        DataStore.set(STORE_KEY, state).catch(e => logger.error("Speichern fehlgeschlagen", e));
    }, 250);
}

export const LarpStore = {
    /** Lädt den gespeicherten Zustand. Mehrfach aufrufbar, lädt nur einmal. */
    init(): Promise<void> {
        return loadPromise ??= (async () => {
            try {
                const saved = await DataStore.get<PersistedState>(STORE_KEY);
                if (saved) {
                    const raw = saved as Partial<PersistedState> & { profile?: unknown; version?: unknown; };
                    const presets = (Array.isArray(raw.presets) ? raw.presets : []).map(sanitizePreset).filter(Boolean) as LarpPreset[];
                    let accounts = sanitizeAccounts(raw.accounts);
                    let active = typeof raw.activeAccount === "string" ? raw.activeAccount : undefined;
                    if (raw.version !== 3 || !accounts.length) {
                        // Versions 1/2: the single profile becomes the first larp account
                        const first = initialState(sanitizeProfile(raw.profile));
                        accounts = first.accounts;
                        active = first.activeAccount;
                    }
                    state = {
                        version: 3,
                        accounts,
                        activeAccount: accounts.some(a => a.id === active) ? active : undefined,
                        presets,
                        activePreset: migrateActivePreset(raw.activePreset, raw.version === 3 ? 2 : raw.version, presets),
                        switchAnimation: typeof raw.switchAnimation === "boolean" ? raw.switchAnimation : true
                    };
                }
            } catch (e) {
                logger.error("Laden fehlgeschlagen, verwende Standardwerte", e);
            }
            loaded = true;
            emit();
        })();
    },

    get isLoaded() {
        return loaded;
    },

    get version() {
        return version;
    },

    /** Aktuelles Larp-Profil (nicht verändern, stattdessen update() nutzen). Real profile → nothing larped. */
    get(): LarpProfile {
        return activeAccount()?.profile ?? REAL_PROFILE;
    },

    /** Tiefes Zusammenführen: Objekte werden gemergt, Arrays ersetzt, undefined entfernt ein Feld */
    update(patch: DeepPartial<LarpProfile> | ((p: LarpProfile) => DeepPartial<LarpProfile>)) {
        const current = this.get();
        const p = typeof patch === "function" ? patch(current) : patch;
        if (!setActiveProfile(sanitizeProfile(deepMerge(current, p)), undefined)) return;
        persist();
        emit();
    },

    /** Profil komplett ersetzen */
    replace(profile: LarpProfile, activePreset?: PresetKey) {
        if (!setActiveProfile(sanitizeProfile(profile), activePreset)) return;
        persist();
        emit();
    },

    // ---- Larp accounts ----

    getAccounts(): readonly LarpAccount[] {
        return state.accounts;
    },

    /** ID of the active larp account, undefined while the real profile is active */
    get activeAccountId(): string | undefined {
        return state.activeAccount;
    },

    get isRealProfile(): boolean {
        return !activeAccount();
    },

    /** Switches to a larp account, or to the real profile with undefined. Nothing is sent to Discord. */
    switchAccount(id: string | undefined) {
        if (id !== undefined && !state.accounts.some(a => a.id === id)) return;
        if (state.activeAccount === id) return;
        state = { ...state, activeAccount: id, activePreset: undefined };
        persist();
        emit();
    },

    /** Creates a larp account (empty, copy of the current profile or from a preset) and switches to it */
    // i18n-keys: accounts.errorLimit (LarpError)
    createAccount(from: { kind: "empty"; } | { kind: "current"; } | { kind: "preset"; key: PresetKey; } = { kind: "empty" }): string {
        if (state.accounts.length >= MAX_ACCOUNTS) throw new LarpError("accounts.errorLimit", { max: MAX_ACCOUNTS });
        let profile = createDefaultProfile();
        if (from.kind === "current") profile = structuredClone(this.get());
        if (from.kind === "preset") {
            const preset = this.findPreset(from.key);
            if (!preset) throw new LarpError("core.presets.errorNotFound", { name: from.key.replace(/^(builtin|user):/, "") });
            profile = structuredClone(preset.profile);
        }
        const id = newAccountId();
        state = { ...state, accounts: [...state.accounts, { id, profile: sanitizeProfile(profile) }], activeAccount: id, activePreset: undefined };
        persist();
        emit();
        return id;
    },

    /** Deletes a larp account. Deleting the active one switches to the real profile. */
    deleteAccount(id: string) {
        if (!state.accounts.some(a => a.id === id)) return;
        state = {
            ...state,
            accounts: state.accounts.filter(a => a.id !== id),
            activeAccount: state.activeAccount === id ? undefined : state.activeAccount
        };
        persist();
        emit();
    },

    /** Moves an account up (-1) or down (+1) in the list */
    moveAccount(id: string, delta: -1 | 1) {
        const i = state.accounts.findIndex(a => a.id === id);
        const j = i + delta;
        if (i < 0 || j < 0 || j >= state.accounts.length) return;
        const accounts = [...state.accounts];
        [accounts[i], accounts[j]] = [accounts[j], accounts[i]];
        state = { ...state, accounts };
        persist();
        emit();
    },

    get switchAnimation(): boolean {
        return state.switchAnimation;
    },

    setSwitchAnimation(value: boolean) {
        state = { ...state, switchAnimation: value };
        persist();
        emit();
    },

    reset() {
        this.replace(createDefaultProfile());
    },

    subscribe(fn: () => void) {
        listeners.add(fn);
        return () => void listeners.delete(fn);
    },

    // ---- Presets ----
    // Fehler werden als LarpError geworfen und erst in der Oberfläche übersetzt (errorText).
    // i18n-keys: core.presets.errorNameRequired, core.presets.errorBuiltinOverwrite, core.presets.errorNotFound, core.presets.errorExists (LarpError)

    /** PresetKey des aktiven Presets (siehe presetKey()) */
    get activePreset(): PresetKey | undefined {
        return state.activePreset;
    },

    getPresets(): LarpPreset[] {
        return [...BUILTIN_PRESETS, ...state.presets];
    },

    getUserPresets(): LarpPreset[] {
        return state.presets;
    },

    /**
     * Sucht ein Preset über seinen PresetKey ("builtin:<id>" / "user:<name>").
     * Aus Kompatibilität geht auch ein bloßer Name (eigenes Preset oder früherer Name eines mitgelieferten).
     */
    findPreset(key: PresetKey): LarpPreset | undefined {
        if (key.startsWith("builtin:")) return findBuiltinPreset(key.slice("builtin:".length));
        if (key.startsWith("user:")) {
            const name = key.slice("user:".length);
            const found = state.presets.find(p => p.name === name);
            if (found) return found;
        }
        const legacy = LEGACY_BUILTIN_NAMES[key];
        if (legacy) return findBuiltinPreset(legacy);
        return state.presets.find(p => p.name === key);
    },

    /** Speichert das aktuelle Profil als eigenes Preset (überschreibt ein eigenes Preset gleichen Namens) */
    savePreset(name: string) {
        name = name.trim().slice(0, 60);
        if (!name) throw new LarpError("core.presets.errorNameRequired");
        if (isReservedPresetName(name)) throw new LarpError("core.presets.errorBuiltinOverwrite");

        const preset: LarpPreset = { name, profile: structuredClone(this.get()) };
        const presets = state.presets.filter(p => p.name !== name);
        presets.push(preset);
        state = { ...state, presets, activePreset: userPresetKey(name) };
        persist();
        emit();
    },

    /** Lädt ein Preset über seinen PresetKey */
    loadPreset(key: PresetKey) {
        const preset = this.findPreset(key);
        if (!preset) throw new LarpError("core.presets.errorNotFound", { name: key.replace(/^(builtin|user):/, "") });
        // Server-Einstellungen sind an eigene Server gebunden → beim Preset-Wechsel behalten, falls das Preset keine hat
        const profile = structuredClone(preset.profile);
        const current = this.get();
        if (!Object.keys(profile.servers).length) profile.servers = current.servers;
        // Genauso das Layout: Presets ohne eigenes Layout lassen das aktuelle stehen
        if (!profile.layout && current.layout) profile.layout = current.layout;
        this.replace(profile, presetKey(preset));
    },

    /** Löscht ein eigenes Preset (mitgelieferte lassen sich nicht löschen) */
    deletePreset(name: string) {
        state = {
            ...state,
            presets: state.presets.filter(p => p.name !== name),
            activePreset: state.activePreset === userPresetKey(name) ? undefined : state.activePreset
        };
        persist();
        emit();
    },

    /** Benennt ein eigenes Preset um */
    renamePreset(oldName: string, newName: string) {
        newName = newName.trim().slice(0, 60);
        if (!newName) throw new LarpError("core.presets.errorNameRequired");
        if (newName === oldName) return;
        if (isReservedPresetName(newName) || state.presets.some(p => p.name === newName))
            throw new LarpError("core.presets.errorExists", { name: newName });
        state = {
            ...state,
            presets: state.presets.map(p => p.name === oldName ? { ...p, name: newName } : p),
            activePreset: state.activePreset === userPresetKey(oldName) ? userPresetKey(newName) : state.activePreset
        };
        persist();
        emit();
    },

    /** Fügt importierte Presets hinzu. Namenskonflikte bekommen ein Suffix. Gibt die Anzahl zurück. */
    importPresets(presets: LarpPreset[]) {
        const existing = new Set(state.presets.map(p => p.name));
        const added: LarpPreset[] = [];
        for (const p of presets) {
            let { name } = p, i = 2;
            // Konflikte mit eigenen Presets und mit Namen mitgelieferter Presets (in jeder Sprache)
            while (existing.has(name) || isReservedPresetName(name)) name = `${p.name} (${i++})`;
            existing.add(name);
            added.push({ name, profile: sanitizeProfile(p.profile) });
        }
        state = { ...state, presets: [...state.presets, ...added] };
        persist();
        emit();
        return added.length;
    }
};

/** React-Hook: rendert bei jeder Store-Änderung neu und liefert das aktuelle Profil */
export function useLarpProfile(): LarpProfile {
    const [, forceUpdate] = useReducer(x => x + 1, 0);
    useEffect(() => LarpStore.subscribe(forceUpdate), []);
    return LarpStore.get();
}

// ---- Larp profiles of other Larpcord users (larpSync) ----
// Filled by larpSync from the sync server. Display only: they only ever reach display copies, the same way
// the own larp profile does. Nothing here is sent to Discord.

const remoteProfiles = new Map<string, LarpProfile>();
/** Users whose real profile the viewer chose to see ("Show real profile") */
const showReal = new Set<string>();
let remoteEnabled = true;
/** IDs the sync server has a profile for (not loaded yet = fetched on first use) */
let remoteIndex = new Set<string>();
let requestRemote: ((userId: string) => void) | undefined;

export const RemoteProfiles = {
    /** Adds, replaces (profile) or removes (null) larp profiles of other users */
    set(entries: Record<string, LarpProfile | null>) {
        let changed = false;
        for (const [id, profile] of Object.entries(entries)) {
            if (isSelf(id)) continue;
            if (profile) remoteProfiles.set(id, profile);
            else if (!remoteProfiles.delete(id)) continue;
            changed = true;
        }
        if (changed) emit();
    },

    clear() {
        remoteIndex = new Set();
        if (!remoteProfiles.size) return;
        remoteProfiles.clear();
        emit();
    },

    /** IDs with a shared profile on the server. Loaded profiles that are no longer listed are dropped. */
    setIndex(ids: Iterable<string>) {
        remoteIndex = new Set(ids);
        let changed = false;
        for (const id of [...remoteProfiles.keys()]) {
            if (remoteIndex.has(id)) continue;
            remoteProfiles.delete(id);
            changed = true;
        }
        if (changed) emit();
    },

    inIndex(userId: string) {
        return remoteIndex.has(userId);
    },

    /** larpSync: called (often, must be cheap) for listed users whose profile isn't loaded yet */
    setRequester(fn: ((userId: string) => void) | undefined) {
        requestRemote = fn;
    },

    /** Larp profile of another user, regardless of the viewer's choices */
    get(userId: string): LarpProfile | undefined {
        return remoteProfiles.get(userId);
    },

    ids(): string[] {
        return [...remoteProfiles.keys()];
    },

    get enabled() {
        return remoteEnabled;
    },

    setEnabled(value: boolean) {
        if (remoteEnabled === value) return;
        remoteEnabled = value;
        emit();
    },

    isShowingReal(userId: string) {
        return showReal.has(userId);
    },

    /** Per-user switch from the profile menu: true = real profile, false = larp profile */
    setShowReal(userId: string, value: boolean) {
        if (value === showReal.has(userId)) return;
        if (value) showReal.add(userId);
        else showReal.delete(userId);
        emit();
    },

    /** Replaces the whole "show real profile" list (loaded by larpSync) */
    loadShowReal(ids: string[]) {
        showReal.clear();
        for (const id of ids) showReal.add(id);
        emit();
    },

    showRealList(): string[] {
        return [...showReal];
    }
};

/** Shown larp profile of another user (respects the viewer's switches), fast path without isSelf */
export function remoteProfileFor(userId: string | null | undefined): LarpProfile | undefined {
    if (!userId || !remoteEnabled || showReal.has(userId)) return undefined;
    const profile = remoteProfiles.get(userId);
    if (!profile && remoteIndex.has(userId)) requestRemote?.(userId);
    return profile;
}

/**
 * Larp profile to display for a user: the own one (active larp account), a shared one of another
 * Larpcord user (larpSync), or undefined. Only features that are shared may use this; everything else
 * (music, roles, servers, layout, themes) stays `isSelf`-only.
 */
export function larpProfileFor(userId: string | null | undefined): LarpProfile | undefined {
    if (!userId) return undefined;
    if (isSelf(userId)) return LarpStore.get();
    return remoteProfileFor(userId);
}

/** React hook: larp profile for a user (own profile when userId is missing), re-renders on changes */
export function useLarpProfileFor(userId?: string | null): LarpProfile | undefined {
    const [, forceUpdate] = useReducer(x => x + 1, 0);
    useEffect(() => LarpStore.subscribe(forceUpdate), []);
    return userId ? larpProfileFor(userId) : LarpStore.get();
}

/** Regel 2: Larp-Overrides gelten ausschließlich für den eigenen User */
export function isSelf(userId: string | null | undefined): boolean {
    if (!userId) return false;
    try {
        return UserStore.getCurrentUser()?.id === userId;
    } catch {
        return false;
    }
}

export function getSelfId(): string | undefined {
    try {
        return UserStore.getCurrentUser()?.id;
    } catch {
        return undefined;
    }
}
