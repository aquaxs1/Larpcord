/*
 * Larpcord, a standalone Discord client for local cosmetic larping
 * Copyright (c) 2026 Larpcord contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { LarpTheme } from "@plugins/larpCore/types";

/*
 * Baut aus den Theme-Einstellungen CSS, das Discords Design-Variablen überschreibt.
 * Alle Werte sind vorher validiert (Hex-Farben, bereinigter Schriftname, Zahl), daher kein CSS-Ausbruch.
 * Die Variablen werden auch auf verschachtelten Theme-Containern gesetzt (z. B. Popouts).
 */

const SCOPE = ":root, .theme-dark, .theme-light, .theme-darker, .theme-midnight";

export const DEFAULT_THEME: Required<Omit<LarpTheme, "enabled" | "font" | "radius">> & Pick<LarpTheme, "font" | "radius"> = {
    accent: "#eb459e",
    background: "#1e1f2b",
    backgroundSecondary: "#171821",
    text: "#f2f3f5"
};

export function buildThemeCss(theme: LarpTheme | undefined): string {
    if (!theme?.enabled) return "";

    const vars: string[] = [];
    const set = (names: string[], value: string) => names.forEach(n => vars.push(`${n}: ${value} !important;`));

    if (theme.accent) {
        set(["--brand-500", "--brand-560", "--brand-experiment", "--button-filled-brand-background", "--control-brand-foreground", "--control-brand-foreground-new"], theme.accent);
        set(["--brand-600", "--button-filled-brand-background-hover"], `color-mix(in oklab, ${theme.accent} 85%, black)`);
    }
    if (theme.background) {
        set(["--background-base-low", "--background-primary", "--bg-base-primary", "--background-surface-high", "--chat-background-default", "--bg-surface-raised"], theme.background);
        set(["--background-surface-higher", "--background-surface-highest", "--background-modifier-hover"], `color-mix(in oklab, ${theme.background} 88%, white)`);
    }
    if (theme.backgroundSecondary) {
        set(["--background-base-lower", "--background-secondary", "--bg-base-secondary", "--background-secondary-alt"], theme.backgroundSecondary);
        set(["--background-base-lowest", "--background-tertiary", "--bg-base-tertiary", "--background-floating"], `color-mix(in oklab, ${theme.backgroundSecondary} 80%, black)`);
    }
    if (theme.text) {
        set(["--text-default", "--text-normal", "--text-primary", "--header-primary", "--interactive-active"], theme.text);
        set(["--text-strong"], `color-mix(in oklab, ${theme.text} 90%, white)`);
        set(["--text-muted", "--interactive-normal", "--channels-default"], `color-mix(in oklab, ${theme.text} 60%, transparent)`);
    }
    if (theme.font) {
        const stack = `"${theme.font}", "gg sans", "Noto Sans", sans-serif`;
        set(["--font-primary", "--font-display"], stack);
    }
    if (theme.radius != null) {
        const r = theme.radius;
        set(["--radius-xs"], `${Math.round(r / 2)}px`);
        set(["--radius-sm"], `${r}px`);
        set(["--radius-md"], `${Math.round(r * 1.5)}px`);
        set(["--radius-lg"], `${r * 2}px`);
        set(["--radius-xl"], `${r * 3}px`);
    }

    return vars.length ? `/* Larpcord Theme */\n${SCOPE} {\n    ${vars.join("\n    ")}\n}\n` : "";
}
