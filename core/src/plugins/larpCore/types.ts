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

export interface LarpNames {
    /** Lokaler Username (ohne @), leer = echter Username */
    username?: string;
    /** Lokaler Anzeigename, leer = echter Anzeigename */
    displayName?: string;
    /** Larp-Name statt Server-Nicknames anzeigen. Standard: an */
    overrideNicknames: boolean;
}

/** Ein Eintrag der Serverleiste: Guild-ID oder "folder:<folderId>" */
export type GuildListKey = string;

export interface LarpButtonLayout {
    /** Reihenfolge der Buttons. Schlüssel = aria-label des Buttons (bzw. seiner Gruppe) */
    order: string[];
    /** Ausgeblendete Buttons (Schlüssel) */
    hidden: string[];
    /** Alle aria-labels, die zu einem Schlüssel gehören (Umschalter wechseln ihr Label) */
    labels: Record<string, string[]>;
}

export interface LarpLayout {
    /** Eigene Reihenfolge der Serverleiste (oberste Ebene). Neue Server landen am Ende. */
    guildOrder: GuildListKey[];
    /** In Larpcord angepinnte DMs (Channel-IDs), in fester Reihenfolge oben */
    pinnedDms: string[];
    /** Buttons im User-Panel */
    userPanel: LarpButtonLayout;
    /** Buttons im Kanal-Header */
    channelHeader: LarpButtonLayout;
    /** User-Panel oben oder unten */
    userPanelPosition: "bottom" | "top";
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
    /** Name-Änderer (nur lokal) */
    names: LarpNames;
    /** guildId → Einstellungen */
    servers: Record<string, ServerLarp>;
    theme?: LarpTheme;
    sounds?: LarpSounds;
    /** Eigenes Layout (larpLayout). Fehlt = Discords Standard-Layout */
    layout?: LarpLayout;
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
