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

/** Lokale Rolle (larpServers). Reine Anzeige, nie Teil der Berechtigungsberechnung. */
export interface LarpRole {
    id: string;
    name: string;
    /** Hex-Farbe (#rrggbb) */
    color: string;
    /** Zweite Farbe für einen Verlauf */
    gradient?: string;
    /** https:- oder data:image/-URL */
    iconUrl?: string;
    /** Der eigenen Person zugewiesen */
    assigned: boolean;
}

export interface ServerLarp {
    partner?: boolean;
    verified?: boolean;
    boostLevel?: 0 | 1 | 2 | 3;
    boostCount?: number;
    /** Eigene Rollen, Reihenfolge = Rangfolge (erste ist die höchste) */
    roles?: LarpRole[];
    /** Lokaler Servername (leer = echter Name) */
    name?: string;
    /** https:- oder data:image/-URL, GIFs erlaubt */
    iconUrl?: string;
    bannerUrl?: string;
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

/** Aktivitätstyp wie bei Discord: 0 Spielt, 1 Streamt, 2 Hört, 3 Schaut, 4 Status, 5 Tritt an */
export type LarpActivityType = 0 | 1 | 2 | 3 | 4 | 5;

export interface LarpActivityTimes {
    /** none = keine Zeit, since = „seit X“, until = „noch X“, progress = Fortschrittsleiste (nur „Hört“) */
    mode: "none" | "since" | "until" | "progress";
    /** true = läuft ab dem Start der App mit, false = fester Zeitpunkt aus `at` */
    live: boolean;
    /** Sekunden. since: bereits vergangen, until: verbleibend, progress: Gesamtlänge */
    seconds?: number;
    /** progress: bereits abgespielte Sekunden */
    elapsed?: number;
    /** Fester Zeitpunkt (ISO), wenn live = false */
    at?: string;
}

/** Gemeinsame Anzeige-Felder von eigenen Aktivitäten und Änderungs-Regeln */
export interface LarpActivityFields {
    name?: string;
    details?: string;
    state?: string;
    /** https:- oder data:image/-URL */
    largeImage?: string;
    largeText?: string;
    smallImage?: string;
    smallText?: string;
    times?: LarpActivityTimes;
}

export interface LarpActivity extends LarpActivityFields {
    id: string;
    enabled: boolean;
    type: LarpActivityType;
    name: string;
    /** Gruppengröße [aktuell, maximal] */
    party?: [number, number];
    /** Knöpfe, reine Anzeige ohne Aktion (Regel 4) */
    buttons?: string[];
    /** Nur bei Typ 4 (Benutzerdefinierter Status): Unicode-Emoji */
    emoji?: string;
}

/** Aktivitäts-Changer: verändert eine echte, erkannte Aktivität rein lokal */
export interface LarpActivityRule extends LarpActivityFields {
    id: string;
    enabled: boolean;
    /** Erkennung: application_id der echten Aktivität oder ihr Name (Kleinschreibung) */
    match: string;
    /** Anzeigename der Anwendung im Hub */
    label?: string;
    /** Aktivität ganz ausblenden */
    hide?: boolean;
}

export interface LarpActivities {
    /** Eigene Aktivitäten anzeigen */
    enabled: boolean;
    list: LarpActivity[];
    rules: LarpActivityRule[];
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
    /** Eigene Aktivitäten und Aktivitäts-Changer (larpActivity) */
    activities?: LarpActivities;
    /** Eigenes Layout (larpLayout). Fehlt = Discords Standard-Layout */
    layout?: LarpLayout;
    /** Standard: false */
    watermark: boolean;
}

/** Stabile IDs der mitgelieferten Presets (Anzeigename über den Schlüssel preset.builtin.<id>) */
export type BuiltinPresetId = "staff" | "nitro" | "og2015";

export interface LarpPreset {
    /** Eigene Presets: frei gewählter Name. Mitgelieferte: Anzeigename in der aktuellen Sprache (Getter) */
    name: string;
    profile: LarpProfile;
    /** Mitgelieferte Presets lassen sich nicht löschen/umbenennen, nur laden */
    builtin?: boolean;
    /** Nur bei mitgelieferten Presets: stabile ID, über die das Preset gefunden wird */
    builtinId?: BuiltinPresetId;
}

export interface LarpExportFile {
    version: 1;
    presets: LarpPreset[];
}

export type DeepPartial<T> = {
    [K in keyof T]?: T[K] extends any[] ? T[K] : T[K] extends object ? DeepPartial<T[K]> : T[K];
};
