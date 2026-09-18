/*
 * Larpcord, a standalone Discord client for local cosmetic larping
 * Copyright (c) 2026 Larpcord contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export interface CustomBadge {
    id: string;
    imageUrl: string;
    tooltip: string;
}

export interface ServerLarp {
    partner?: boolean;
    verified?: boolean;
    boostLevel?: 0 | 1 | 2 | 3;
    boostCount?: number;
}

export interface LarpTheme {
    enabled: boolean;
    /** Hex-Farben (#rrggbb) */
    accent?: string;
    background?: string;
    backgroundSecondary?: string;
    text?: string;
    font?: string;
    /** Eckenradius in px */
    radius?: number;
}

export interface LarpSounds {
    /** data:audio/…-URL oder https-URL */
    message?: string;
    call?: string;
}

export interface LarpProfile {
    badges: { builtin: string[]; custom: CustomBadge[]; };
    /** Reihenfolge aller Badges (builtin-ID oder "custom:<id>"). Fehlende IDs werden hinten angehängt. */
    badgeOrder?: string[];
    /** ISO-Datum */
    memberSince?: string;
    clanTag?: { tag: string; iconUrl?: string; };
    nitro: { enabled: boolean; since?: string; boostSince?: string; };
    profile: { themeColors?: [string, string]; bannerUrl?: string; animatedAvatarUrl?: string; };
    decoration?: { asset: string; skuId?: string; };
    profileEffect?: string;
    /** SKU-ID der Nameplate */
    nameplate?: string;
    /** Zwischengespeicherte Nameplate-Daten, damit sie auch ohne geladenen Shop-Katalog funktioniert */
    nameplateData?: { asset: string; label?: string; palette?: string; };
    /** font: Discord-Schrift-Schlüssel (z. B. "BANGERS"), effect: Discord-Effekt (z. B. "NEON") */
    nameStyle?: { font?: string; gradient?: [string, string]; glow?: boolean; effect?: string; };
    extras: { verifiedCheck: boolean; ownerCrown: boolean; };
    /** guildId → Einstellungen */
    servers: Record<string, ServerLarp>;
    theme?: LarpTheme;
    sounds?: LarpSounds;
    /** Standard: false */
    watermark: boolean;
}

export interface LarpPreset {
    name: string;
    profile: LarpProfile;
    /** Mitgelieferte Presets lassen sich nicht löschen/umbenennen, nur laden */
    builtin?: boolean;
}

export interface LarpExportFile {
    version: 1;
    presets: LarpPreset[];
}

export type DeepPartial<T> = {
    [K in keyof T]?: T[K] extends any[] ? T[K] : T[K] extends object ? DeepPartial<T[K]> : T[K];
};
