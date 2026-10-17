/*
 * Larpcord, a standalone Discord client for local cosmetic larping
 * Copyright (c) 2026 Larpcord contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { t } from "@plugins/larpCore/i18n";
import { LarpProfile } from "@plugins/larpCore/types";

import { NAME_FONT_FACES } from "./nameFonts";

/*
 * Discords native Anzeigenamen-Stile: { fontId, effectId, colors }. Die IDs stammen aus Discords
 * eigenen Enums (DisplayNameFont / DisplayNameEffect) im Client.
 *
 * Beschriftungen: Schriftnamen sind Eigennamen (label), übersetzbare Texte nur als Schlüssel
 * (labelKey), damit sie erst beim Rendern in der aktuellen Sprache aufgelöst werden.
 */

export const NAME_FONTS: Record<string, { id: number; label?: string; labelKey?: string; css: string; bundled?: boolean; }> = {
    DEFAULT: { id: 11, labelKey: "common.default", css: "var(--font-display)" },
    BANGERS: { id: 1, label: "Bangers", css: "Bangers", bundled: true },
    BIO_RHYME: { id: 2, label: "BioRhyme", css: "BioRhyme", bundled: true },
    CHERRY_BOMB: { id: 3, label: "Cherry Bomb", css: "Cherry Bomb One", bundled: true },
    CHICLE: { id: 4, label: "Chicle", css: "Chicle", bundled: true },
    COMPAGNON: { id: 5, label: "Compagnon", css: "Compagnon" },
    MUSEO_MODERNO: { id: 6, label: "MuseoModerno", css: "MuseoModerno", bundled: true },
    NEO_CASTEL: { id: 7, label: "Neo-Castel", css: "Neo Castel" },
    PIXELIFY: { id: 8, label: "Pixelify", css: "Pixelify Sans", bundled: true },
    RIBES: { id: 9, label: "Ribes", css: "Ribes" },
    SINISTRE: { id: 10, label: "Sinistre", css: "Sinistre" },
    ZILLA_SLAB: { id: 12, label: "Zilla Slab", css: "Zilla Slab", bundled: true },
    PLAYPEN_SANS: { id: 13, label: "Playpen Sans", css: "Playpen Sans", bundled: true },
    ORBITRON: { id: 14, label: "Orbitron", css: "Orbitron", bundled: true },
    NEW_ROCKER: { id: 15, label: "New Rocker", css: "New Rocker", bundled: true },
    KALAM: { id: 16, label: "Kalam", css: "Kalam", bundled: true },
};

export const NAME_EFFECTS: Record<string, { id: number; labelKey: string; }> = {
    SOLID: { id: 1, labelKey: "name.effect.solid" },
    GRADIENT: { id: 2, labelKey: "name.effect.gradient" },
    NEON: { id: 3, labelKey: "name.effect.neon" },
    TOON: { id: 4, labelKey: "name.effect.toon" },
    POP: { id: 5, labelKey: "name.effect.pop" },
    GLOW: { id: 6, labelKey: "name.effect.glow" },
    PRISM: { id: 7, labelKey: "name.effect.prism" },
    GUMMY: { id: 8, labelKey: "name.effect.gummy" },
};

const FONT_STYLE_ID = "larpcord-name-fonts";

/**
 * Loads the name fonts for Larpcord's own previews (hub). Discord only loads them where it
 * renders a styled name itself, so without this the preview would fall back to the default font.
 * The fonts are bundled with Larpcord (./nameFonts.ts), so nothing is fetched from Google;
 * fonts that are not bundled keep Discord's own font or the fallback.
 */
export function ensureNameFontsLoaded() {
    try {
        if (document.getElementById(FONT_STYLE_ID)) return;
        const style = document.createElement("style");
        style.id = FONT_STYLE_ID;
        style.textContent = NAME_FONT_FACES;
        document.head.appendChild(style);
    } catch {
        // Preview only: without the fonts the fallback font is shown
    }
}

/** Anzeigename einer Schrift in der aktuellen Sprache */
export function fontLabel(font: string) {
    const f = NAME_FONTS[font];
    if (!f) return font;
    return f.labelKey ? t(f.labelKey) : f.label ?? font;
}

/** Anzeigename eines Effekts in der aktuellen Sprache */
export function effectLabel(effect: string) {
    const e = NAME_EFFECTS[effect];
    return e ? t(e.labelKey) : effect;
}

/** Effekt: explizit gewählt, sonst aus glow/gradient abgeleitet */
export function resolveEffect(style: LarpProfile["nameStyle"]) {
    if (!style) return undefined;
    if (style.effect && NAME_EFFECTS[style.effect]) return style.effect;
    if (style.glow) return "GLOW";
    if (style.gradient) return "GRADIENT";
    return undefined;
}

export function hasNameStyle(style: LarpProfile["nameStyle"]) {
    return !!style && (!!(style.font && NAME_FONTS[style.font]) || !!resolveEffect(style));
}

/** LarpProfile.nameStyle → Discords displayNameStyles-Objekt */
export function toDisplayNameStyles(style: LarpProfile["nameStyle"]) {
    if (!style || !hasNameStyle(style)) return null;
    const effect = resolveEffect(style) ?? "SOLID";
    const [c1, c2] = style.gradient ?? ["#ff73fa", "#5865f2"];
    const colors = effect === "SOLID" || effect === "GLOW" ? [c1] : [c1, c2];
    return {
        fontId: NAME_FONTS[style.font ?? "DEFAULT"]?.id ?? NAME_FONTS.DEFAULT.id,
        effectId: NAME_EFFECTS[effect].id,
        colors: colors.map(c => parseInt(c.slice(1), 16))
    };
}
