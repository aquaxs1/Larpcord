/*
 * Larpcord, a standalone Discord client for local cosmetic larping
 * Copyright (c) 2026 Larpcord contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

/*
 * Larpcord-i18n für den Core.
 * - Sprache kommt aus Discords LocaleStore (nicht aus dem System) und wird live übernommen.
 * - Texte: t("bereich.schluessel", { variable }) bzw. tNode(...) für Texte mit React-Elementen.
 * - React: useLarpLocale() in Komponenten aufrufen, dann rendern sie bei Sprachwechsel neu.
 * - Neue Sprache: nur eine neue JSON-Datei in ./locales anlegen (wird beim Build automatisch gefunden).
 */

import { Logger } from "@utils/Logger";
import { waitForStore } from "@webpack/common/internal";
import { LocaleStore, React, useEffect, useReducer } from "@webpack/common";
import type { ReactNode } from "react";
import LOCALES from "~larpcord-locales";

import { createTranslator, TranslateVars } from "./translator";

const logger = new Logger("Larpcord i18n", "#eb459e");
const reportedMissing = new Set<string>();

const translator = createTranslator(LOCALES, key => {
    if (reportedMissing.has(key)) return;
    reportedMissing.add(key);
    logger.warn(`Fehlender Übersetzungsschlüssel: ${key}`);
});

const listeners = new Set<() => void>();

/** Text in der aktuellen Discord-Sprache */
export function t(key: string, vars?: TranslateVars): string {
    return translator.t(key, vars);
}

/** Wie t(), aber Platzhalter dürfen React-Elemente sein, z. B. tNode("x", { file: <code>a.json</code> }) */
export function tNode(key: string, vars: Record<string, ReactNode>): ReactNode {
    const text = translator.t(key, Object.fromEntries(Object.entries(vars).filter(([, v]) => typeof v === "string" || typeof v === "number")) as TranslateVars);
    const parts = text.split(/\{(\w+)\}/);
    return parts.map((part, i) => {
        if (i % 2 === 0) return part;
        return <React.Fragment key={i}>{vars[part] ?? `{${part}}`}</React.Fragment>;
    });
}

/**
 * Fehler mit Übersetzungsschlüssel. Store/Logik werfen LarpError("core.presets.errorExists", { name }),
 * die Oberfläche zeigt errorText(e) in der aktuellen Sprache (auch nach einem Sprachwechsel korrekt).
 */
export class LarpError extends Error {
    constructor(public readonly key: string, public readonly vars?: TranslateVars) {
        super(translator.t(key, vars));
        this.name = "LarpError";
    }
}

/** Fehlermeldung für die Oberfläche (LarpError übersetzt, sonst message) */
export function errorText(e: unknown): string {
    if (e instanceof LarpError) return translator.t(e.key, e.vars);
    if (e instanceof Error) return e.message;
    return String(e);
}

export function hasTranslation(key: string) {
    return translator.has(key);
}

/** Aufgelöste Sprachdatei, z. B. "de" oder "en" */
export function getLarpLocale() {
    return translator.locale;
}

/** Discords Locale (z. B. "en-GB") für Intl.DateTimeFormat / NumberFormat */
export function getIntlLocale() {
    return translator.intlLocale;
}

export function getAvailableLocales() {
    return translator.available;
}

/** Listener für Sprachwechsel. Gibt eine Abmelde-Funktion zurück. */
export function onLocaleChange(listener: () => void) {
    listeners.add(listener);
    return () => void listeners.delete(listener);
}

/** React-Hook: Komponente rendert bei jedem Sprachwechsel neu. Gibt die aktuelle Sprache zurück. */
export function useLarpLocale() {
    const [, force] = useReducer((x: number) => x + 1, 0);
    useEffect(() => onLocaleChange(force), []);
    return translator.locale;
}

/** Datum in Discords Sprache formatieren */
export function formatLarpDate(date: Date | number | string, options: Intl.DateTimeFormatOptions = { dateStyle: "medium" }) {
    const d = date instanceof Date ? date : new Date(date);
    if (Number.isNaN(d.getTime())) return "";
    try {
        return new Intl.DateTimeFormat(translator.intlLocale, options).format(d);
    } catch {
        return d.toLocaleDateString();
    }
}

export function formatLarpNumber(n: number, options?: Intl.NumberFormatOptions) {
    try {
        return new Intl.NumberFormat(translator.intlLocale, options).format(n);
    } catch {
        return String(n);
    }
}

function readDiscordLocale(): string | undefined {
    try {
        return LocaleStore?.locale || undefined;
    } catch {
        return undefined;
    }
}

function sync() {
    const raw = readDiscordLocale();
    if (!raw || !translator.setLocale(raw)) return;
    for (const listener of listeners) {
        try {
            listener();
        } catch (e) {
            logger.error("Listener für Sprachwechsel fehlgeschlagen", e);
        }
    }
}

let started = false;
let subscribedStore: typeof LocaleStore | undefined;

/** Von LarpCore.start() aufgerufen. Hängt sich an Discords LocaleStore, sobald er geladen ist. */
export function startI18n() {
    if (started) return;
    started = true;

    const attach = (store: typeof LocaleStore) => {
        if (!started || !store || subscribedStore === store) return;
        subscribedStore = store;
        try {
            store.addChangeListener(sync);
        } catch (e) {
            logger.error("Konnte nicht auf Sprachwechsel hören", e);
        }
        sync();
    };

    if (LocaleStore) attach(LocaleStore);
    else waitForStore("LocaleStore", attach);
}

export function stopI18n() {
    started = false;
    try {
        subscribedStore?.removeChangeListener(sync);
    } catch { }
    subscribedStore = undefined;
}
