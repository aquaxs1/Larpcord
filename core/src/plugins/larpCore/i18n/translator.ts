/*
 * Larpcord, a standalone Discord client for local cosmetic larping
 * Copyright (c) 2026 Larpcord contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

/*
 * Reine Übersetzungslogik ohne Vencord- oder Electron-Abhängigkeiten.
 * Wird vom Core (i18n/index.ts) und vom Desktop-Main-Prozess (desktop/src/main/i18n.ts) gemeinsam genutzt.
 *
 * Sprachdateien: flache Objekte { "bereich.schluessel": "Text mit {variable}" }.
 * Mehrzahl: Schlüssel mit Suffix .zero/.one/.two/.few/.many/.other, aufgerufen mit t("x", { count }).
 * Fallback-Reihenfolge: aktuelle Sprache → en → Schlüssel selbst.
 */

export type LocaleDict = Record<string, string>;
export type LocaleTable = Record<string, LocaleDict>;
export type TranslateVars = Record<string, string | number | undefined | null>;

export const FALLBACK_LOCALE = "en";
export const PLURAL_CATEGORIES = ["zero", "one", "two", "few", "many", "other"] as const;

/** Discord-/System-Locale (z. B. "en-US", "pt_BR", "de") auf eine vorhandene Sprachdatei abbilden */
export function resolveLocale(table: LocaleTable, raw: string | null | undefined): string {
    if (!raw) return FALLBACK_LOCALE;
    const norm = String(raw).trim().replace(/_/g, "-");
    const keys = Object.keys(table);
    const exact = keys.find(k => k.toLowerCase() === norm.toLowerCase());
    if (exact) return exact;
    const base = norm.split("-")[0].toLowerCase();
    const baseMatch = keys.find(k => k.toLowerCase() === base);
    if (baseMatch) return baseMatch;
    return FALLBACK_LOCALE;
}

export function interpolate(text: string, vars?: TranslateVars) {
    if (!vars) return text;
    return text.replace(/\{(\w+)\}/g, (whole, name: string) => {
        const v = vars[name];
        return v == null ? whole : String(v);
    });
}

export interface Translator {
    t(key: string, vars?: TranslateVars): string;
    has(key: string): boolean;
    /** Aufgelöste Sprachdatei, z. B. "de" */
    readonly locale: string;
    /** Ursprüngliche Locale (z. B. "en-GB"), für Intl-Formatierung von Datum und Zahlen */
    readonly intlLocale: string;
    /** Gibt true zurück, wenn sich die aufgelöste Sprache geändert hat */
    setLocale(raw: string | null | undefined): boolean;
    readonly available: string[];
}

export function createTranslator(table: LocaleTable, onMissing?: (key: string) => void): Translator {
    let locale = FALLBACK_LOCALE;
    let intlLocale = FALLBACK_LOCALE;
    const fallback = () => table[FALLBACK_LOCALE] ?? {};
    const pluralCache = new Map<string, Intl.PluralRules>();

    function plural(loc: string, count: number) {
        let rules = pluralCache.get(loc);
        if (!rules) {
            try {
                rules = new Intl.PluralRules(loc);
            } catch {
                rules = new Intl.PluralRules(FALLBACK_LOCALE);
            }
            pluralCache.set(loc, rules);
        }
        return rules.select(count);
    }

    function lookupIn(dict: LocaleDict | undefined, loc: string, key: string, count: unknown) {
        if (!dict) return undefined;
        if (typeof count === "number") {
            const exact = count === 0 ? dict[`${key}.zero`] : undefined;
            return exact ?? dict[`${key}.${plural(loc, count)}`] ?? dict[`${key}.other`] ?? dict[key];
        }
        return dict[key];
    }

    return {
        t(key, vars) {
            const count = vars?.count;
            const text = lookupIn(table[locale], locale, key, count)
                ?? lookupIn(fallback(), FALLBACK_LOCALE, key, count);
            if (text == null) {
                onMissing?.(key);
                return key;
            }
            return interpolate(text, vars);
        },
        has(key) {
            return lookupIn(table[locale], locale, key, 1) != null || lookupIn(fallback(), FALLBACK_LOCALE, key, 1) != null;
        },
        get locale() {
            return locale;
        },
        get intlLocale() {
            return intlLocale;
        },
        get available() {
            return Object.keys(table);
        },
        setLocale(raw) {
            const next = resolveLocale(table, raw);
            const nextIntl = raw ? String(raw).replace(/_/g, "-") : next;
            if (next === locale && nextIntl === intlLocale) return false;
            locale = next;
            intlLocale = nextIntl;
            return true;
        }
    };
}
