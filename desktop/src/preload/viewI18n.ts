/*
 * Larpcord, a standalone Discord client for local cosmetic larping
 * Copyright (c) 2026 Larpcord contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// Gemeinsame i18n-Brücke für die eigenen HTML-Views (Splash, Onboarding, Updater, About).
// Die View bindet static/views/i18n.js ein, das alle Elemente mit data-i18n="desktop.…" übersetzt.

import { contextBridge, ipcRenderer } from "electron/renderer";

import { IpcEvents } from "../shared/IpcEvents";

export interface ViewStrings {
    locale: string;
    strings: Record<string, string>;
}

export function exposeViewI18n() {
    contextBridge.exposeInMainWorld("LarpcordViewI18n", {
        get: (): ViewStrings => ipcRenderer.sendSync(IpcEvents.LARP_GET_VIEW_STRINGS),
        onChange(cb: (data: ViewStrings) => void) {
            ipcRenderer.on(IpcEvents.LARP_LOCALE_CHANGED, (_, data: ViewStrings) => cb(data));
        }
    });
}
