/*
 * Larpcord, a standalone Discord client for local cosmetic larping
 * Copyright (c) 2026 Larpcord contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// Übersetzt die eigenen Views. Braucht window.LarpcordViewI18n (preload/viewI18n.ts).
//   <p data-i18n="desktop.splash.loading"></p>              → textContent
//   <input data-i18n-placeholder="desktop.x">               → placeholder
//   <img data-i18n-alt="desktop.x">, data-i18n-title="…"    → alt / title
//   data-i18n-vars='{"version":"1.2.3"}'                     → Platzhalter {version}
// Im Skript: LarpcordI18n.t("desktop.key", { var }) und LarpcordI18n.onChange(fn).
(() => {
    const bridge = window.LarpcordViewI18n;
    let data = { locale: "en", strings: {} };
    const listeners = new Set();

    function t(key, vars) {
        const text = data.strings[key] ?? key;
        if (!vars) return text;
        return text.replace(/\{(\w+)\}/g, (whole, name) => (vars[name] == null ? whole : String(vars[name])));
    }

    function vars(el) {
        try {
            return el.dataset.i18nVars ? JSON.parse(el.dataset.i18nVars) : undefined;
        } catch {
            return undefined;
        }
    }

    function apply(root = document) {
        document.documentElement.lang = data.locale;
        for (const el of root.querySelectorAll("[data-i18n]")) el.textContent = t(el.dataset.i18n, vars(el));
        for (const [attr, prop] of [["placeholder", "i18nPlaceholder"], ["alt", "i18nAlt"], ["title", "i18nTitle"], ["aria-label", "i18nAria"]]) {
            for (const el of root.querySelectorAll(`[data-i18n-${attr === "aria-label" ? "aria" : attr}]`)) el.setAttribute(attr, t(el.dataset[prop], vars(el)));
        }
    }

    function load(next) {
        if (next && next.strings) data = next;
        apply();
        for (const fn of listeners) {
            try {
                fn(data.locale);
            } catch (e) {
                console.error(e);
            }
        }
    }

    try {
        if (bridge) data = bridge.get() || data;
    } catch (e) {
        console.error("[Larpcord] Übersetzungen konnten nicht geladen werden", e);
    }
    bridge?.onChange?.(load);

    window.LarpcordI18n = {
        t,
        apply,
        get locale() {
            return data.locale;
        },
        onChange: fn => listeners.add(fn)
    };

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => apply());
    else apply();
})();
