/*
 * Larpcord, a standalone Discord client for local cosmetic larping
 * Copyright (c) 2026 Larpcord contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

/*
 * i18n im Main-Prozess (Tray, Menü, Dialoge, Splash, Onboarding, Updater).
 * Nutzt dieselben Sprachdateien und dieselbe Logik wie der Core (core/src/plugins/larpCore/i18n).
 * Sprache: zuletzt vom Core gemeldete Discord-Sprache (Settings.larpLocale), sonst Systemsprache.
 * Der Core meldet Änderungen per IPC (LARP_SET_LOCALE), dann werden Tray/Menü/offene Fenster aktualisiert.
 */

import { app, BrowserWindow } from "electron";

import LOCALES from "~larpcord-locales";

import { createTranslator, TranslateVars } from "../../../core/src/plugins/larpCore/i18n/translator";
import { IpcEvents } from "../shared/IpcEvents";
import { Settings } from "./settings";
import { handle, handleSync } from "./utils/ipcWrappers";

const translator = createTranslator(LOCALES);
const listeners = new Set<() => void>();
let initialized = false;

function systemLocale() {
    try {
        return app.getPreferredSystemLanguages?.()[0] || app.getLocale() || undefined;
    } catch {
        return undefined;
    }
}

function ensureInit() {
    if (initialized) return;
    // app.getLocale() ist erst nach "ready" zuverlässig, bis dahin gilt die gespeicherte Sprache bzw. en
    if (!app.isReady() && !Settings.store.larpLocale) {
        translator.setLocale(undefined);
        return;
    }
    initialized = true;
    translator.setLocale(Settings.store.larpLocale || systemLocale());
}

export function t(key: string, vars?: TranslateVars) {
    ensureInit();
    return translator.t(key, vars);
}

export function getMainLocale() {
    ensureInit();
    return translator.locale;
}

/** Listener für Sprachwechsel (z. B. Tray-Menü neu bauen). Gibt eine Abmelde-Funktion zurück. */
export function onMainLocaleChange(listener: () => void) {
    listeners.add(listener);
    return () => void listeners.delete(listener);
}

// preset.builtin.*: Namen der mitgelieferten Presets, die das Onboarding zur Auswahl anbietet
const VIEW_PREFIXES = ["desktop.", "preset.builtin."];

/** Texte der aktuellen Sprache (mit en-Fallback) für die HTML-Views */
export function getViewStrings() {
    ensureInit();
    const strings: Record<string, string> = {};
    for (const dict of [LOCALES.en, LOCALES[translator.locale]]) {
        if (!dict) continue;
        for (const [k, v] of Object.entries(dict)) if (VIEW_PREFIXES.some(p => k.startsWith(p))) strings[k] = v;
    }
    return { locale: translator.locale, strings };
}

export function setLocaleFromRenderer(raw: unknown) {
    if (typeof raw !== "string" || !raw || raw.length > 20 || !/^[\w-]+$/.test(raw)) return;
    if (Settings.store.larpLocale !== raw) Settings.store.larpLocale = raw;
    initialized = true;
    if (!translator.setLocale(raw)) return;

    for (const listener of listeners) {
        try {
            listener();
        } catch (e) {
            console.error("[Larpcord i18n] Listener fehlgeschlagen", e);
        }
    }
    const payload = getViewStrings();
    for (const win of BrowserWindow.getAllWindows()) {
        if (!win.isDestroyed()) win.webContents.send(IpcEvents.LARP_LOCALE_CHANGED, payload);
    }
}

app.whenReady().then(() => ensureInit());

handle(IpcEvents.LARP_SET_LOCALE, (_, locale: unknown) => setLocaleFromRenderer(locale));
handleSync(IpcEvents.LARP_GET_VIEW_STRINGS, () => getViewStrings());
