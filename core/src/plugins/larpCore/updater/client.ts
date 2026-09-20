/*
 * Larpcord, a standalone Discord client for local cosmetic larping
 * Copyright (c) 2026 Larpcord contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

/*
 * Brücke zum Larpcord-Auto-Updater im Desktop-Teil (desktop/src/main/updater.ts).
 * Ohne Desktop-Teil (z. B. Web oder alter Desktop) ist alles ein No-op, isUpdaterAvailable() ist dann false.
 */

import { useEffect, useState } from "@webpack/common";

import type { LarpUpdaterOptions, LarpUpdaterStatus } from "./types";
import { logger } from "../store";

export type { LarpUpdateChannel, LarpUpdaterOptions, LarpUpdaterStatus } from "./types";

interface UpdaterNative {
    getStatus(): Promise<LarpUpdaterStatus>;
    onStatus(cb: (s: LarpUpdaterStatus) => void): () => void;
    check(): Promise<LarpUpdaterStatus>;
    setOptions(o: LarpUpdaterOptions): Promise<LarpUpdaterStatus>;
    install(): Promise<boolean>;
    dismiss(version: string): Promise<LarpUpdaterStatus>;
}

function native(): UpdaterNative | undefined {
    try {
        return IS_VESKTOP ? VesktopNative?.larpcord?.updater : undefined;
    } catch {
        return undefined;
    }
}

export const isUpdaterAvailable = () => !!native();

let status: LarpUpdaterStatus | null = null;
const listeners = new Set<(s: LarpUpdaterStatus | null) => void>();

function emit(next: LarpUpdaterStatus | null) {
    status = next;
    for (const l of listeners) {
        try {
            l(status);
        } catch (e) {
            logger.error("Updater-Listener fehlgeschlagen", e);
        }
    }
}

export function getUpdaterStatus() {
    return status;
}

export function onUpdaterStatus(listener: (s: LarpUpdaterStatus | null) => void) {
    listeners.add(listener);
    return () => void listeners.delete(listener);
}

export function useUpdaterStatus() {
    const [s, set] = useState(status);
    useEffect(() => onUpdaterStatus(set), []);
    return s;
}

async function call<T>(fn: (n: UpdaterNative) => Promise<T>): Promise<T | undefined> {
    const n = native();
    if (!n) return undefined;
    try {
        return await fn(n);
    } catch (e) {
        logger.warn("Updater-Aufruf fehlgeschlagen", e);
        return undefined;
    }
}

export const checkForUpdates = () => call(n => n.check()).then(s => (s && emit(s), s));
export const setUpdaterOptions = (o: LarpUpdaterOptions) => call(n => n.setOptions(o)).then(s => (s && emit(s), s));
export const installUpdateNow = () => call(n => n.install());
export const dismissUpdate = (version: string) => call(n => n.dismiss(version));

let unsubscribeNative: (() => void) | undefined;

export async function startUpdaterClient() {
    const n = native();
    if (!n || unsubscribeNative) return;
    try {
        unsubscribeNative = n.onStatus(emit);
        emit(await n.getStatus());
    } catch (e) {
        logger.warn("Updater-Status konnte nicht geladen werden", e);
    }
}

export function stopUpdaterClient() {
    try {
        unsubscribeNative?.();
    } catch { }
    unsubscribeNative = undefined;
}
