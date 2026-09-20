/*
 * Larpcord, a standalone Discord client for local cosmetic larping
 * Copyright (c) 2026 Larpcord contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

/*
 * i18n für den Desktop-Renderer (Einstellungs-Tab „Larpcord Desktop“, Bildschirmübertragung, Rechtschreibprüfung).
 * Der Renderer kann keine Core-Module importieren, deshalb läuft alles über die Brücke
 * Vencord.Plugins.plugins.LarpCore.i18n (Sprache = Discords Sprache, Wechsel kommen live).
 * Fehlt LarpCore, übersetzt ein eigener Translator mit den mitgebündelten Sprachdateien
 * (zuletzt gespeicherte Discord-Sprache, sonst Browsersprache, sonst en).
 */

import { React, useEffect, useReducer } from "@vencord/types/webpack/common";
import type { ReactNode } from "react";

import LOCALES from "~larpcord-locales";

import { createTranslator, TranslateVars } from "../../../core/src/plugins/larpCore/i18n/translator";
import { VesktopLogger } from "./logger";
import { Settings } from "./settings";

/** Teil der Core-API (core/src/plugins/larpCore/i18n), den der Desktop-Renderer braucht */
interface LarpCoreI18n {
    t(key: string, vars?: TranslateVars): string;
    getLarpLocale(): string;
    onLocaleChange(listener: () => void): () => void;
}

function bridge(): LarpCoreI18n | undefined {
    try {
        const api = (Vencord?.Plugins?.plugins?.LarpCore as any)?.i18n as LarpCoreI18n | undefined;
        return typeof api?.t === "function" ? api : undefined;
    } catch {
        return undefined;
    }
}

let fallback: ReturnType<typeof createTranslator> | undefined;
function fallbackTranslator() {
    if (!fallback) {
        VesktopLogger.warn("LarpCore-i18n nicht verfügbar, nutze mitgebündelte Sprachdateien");
        fallback = createTranslator(LOCALES);
        fallback.setLocale(Settings.store.larpLocale || navigator.language);
    }
    return fallback;
}

/** Text in der aktuellen Discord-Sprache */
export function t(key: string, vars?: TranslateVars): string {
    const api = bridge();
    if (api) {
        try {
            return api.t(key, vars);
        } catch {}
    }
    return fallbackTranslator().t(key, vars);
}

/** Wie t(), aber Platzhalter dürfen React-Elemente sein, z. B. tNode(key, { link: <a>…</a> }) */
export function tNode(key: string, vars: Record<string, ReactNode>): ReactNode {
    const plain = Object.fromEntries(
        Object.entries(vars).filter(([, v]) => typeof v === "string" || typeof v === "number")
    ) as TranslateVars;
    const parts = t(key, plain).split(/\{(\w+)\}/);
    return parts.map((part, i) => {
        if (i % 2 === 0) return part;
        return React.createElement(React.Fragment, { key: i }, vars[part] ?? `{${part}}`);
    });
}

export function getLarpLocale(): string {
    const api = bridge();
    if (api) {
        try {
            return api.getLarpLocale();
        } catch {}
    }
    return fallbackTranslator().locale;
}

/** Listener für Sprachwechsel. Gibt eine Abmelde-Funktion zurück. */
export function onLocaleChange(listener: () => void): () => void {
    try {
        return bridge()?.onLocaleChange(listener) ?? (() => {});
    } catch {
        return () => {};
    }
}

/** React-Hook: Komponente rendert bei jedem Sprachwechsel neu. Gibt die aktuelle Sprache zurück. */
export function useLarpLocale() {
    const [, force] = useReducer((x: number) => x + 1, 0);
    useEffect(() => onLocaleChange(force), []);
    return getLarpLocale();
}
