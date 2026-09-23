/*
 * Larpcord, a standalone Discord client for local cosmetic larping
 * Copyright (c) 2026 Larpcord contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { isSelf, LarpStore, logger } from "@plugins/larpCore/store";
import { LarpRole } from "@plugins/larpCore/types";

/*
 * Lokale Rollen.
 *
 * Harte Regel: Larp-Rollen tauchen nie in `member.roles`, im GuildRoleStore oder in sonst einer
 * Struktur auf, aus der Discord Berechtigungen berechnet. Erzeugt werden sie erst dort, wo eine
 * fertige Rollenliste *angezeigt* wird (Profil-Abschnitt), und als Farbe/Icon an den Namen.
 * Sie bekommen deshalb auch keine `permissions`, sondern nur Anzeige-Felder.
 */

/** Präfix der IDs, damit Larp-Rollen überall eindeutig erkennbar sind */
export const LARP_ROLE_PREFIX = "larprole-";

export interface DisplayRole {
    id: string;
    name: string;
    guildId: string;
    color: number;
    colorString: string;
    colors: { primary_color: number; secondary_color: number | null; tertiary_color: null; };
    colorStrings: { primaryColor: string; secondaryColor: string | null; tertiaryColor: null; };
    position: number;
    hoist: boolean;
    managed: boolean;
    mentionable: boolean;
    icon: string | null;
    unicodeEmoji: null;
    flags: number;
    description: null;
    tags: Record<string, never>;
    /** Kennzeichnung für unsere eigenen Patches */
    larpRole: true;
}

export function isLarpRole(role: unknown): boolean {
    if (role == null || typeof role !== "object") return false;
    if ((role as { larpRole?: boolean; }).larpRole === true) return true;
    const { id } = role as { id?: unknown; };
    return typeof id === "string" && id.startsWith(LARP_ROLE_PREFIX);
}

/** Rollen eines Servers (alle, auch nicht zugewiesene) */
export function rolesOf(guildId: string | undefined | null): LarpRole[] {
    if (!guildId) return [];
    return LarpStore.get().servers[guildId]?.roles ?? [];
}

/** Zugewiesene Rollen in Rangfolge (erste = höchste) */
export function assignedRoles(guildId: string | undefined | null): LarpRole[] {
    return rolesOf(guildId).filter(r => r.assigned);
}

/** Höchste zugewiesene Rolle mit Farbe */
export function topColorRole(guildId: string | undefined | null): LarpRole | undefined {
    return assignedRoles(guildId).find(r => !!r.color);
}

/** Höchste zugewiesene Rolle mit Icon */
export function topIconRole(guildId: string | undefined | null): LarpRole | undefined {
    return assignedRoles(guildId).find(r => !!r.iconUrl);
}

// ---- Rollen-Icons ----

/*
 * Discord baut Rollen-Icon-URLs aus der Rollen-ID und einem CDN-Hash. Unsere Icons liegen als
 * beliebige URL vor, deshalb steht im Feld `icon` nur ein Schlüssel "larp:<id>", den ein Patch
 * in die echte URL auflöst (siehe index.tsx).
 */
const ICON_PREFIX = "larp:";
const iconUrls = new Map<string, string>();

function iconKey(role: LarpRole): string | null {
    if (!role.iconUrl) return null;
    iconUrls.set(role.id, role.iconUrl);
    return ICON_PREFIX + role.id;
}

/** Vom Patch aufgerufen: Icon-Schlüssel → echte URL */
export function resolveRoleIcon(icon: unknown): string | undefined {
    if (typeof icon !== "string" || !icon.startsWith(ICON_PREFIX)) return undefined;
    return iconUrls.get(icon.slice(ICON_PREFIX.length));
}

// ---- Umwandlung in Discord-Rollenobjekte ----

function colorNumber(hex: string | undefined): number {
    if (!hex) return 0;
    const n = Number.parseInt(hex.slice(1), 16);
    return Number.isFinite(n) ? n : 0;
}

const cache = new Map<string, { version: number; roles: DisplayRole[]; }>();

/**
 * Anzeige-Rollenobjekte eines Servers. Positionen liegen bewusst sehr hoch, damit Discords
 * Sortierung sie oben einordnet; die Zahlen wirken sich nur auf die Anzeige aus.
 */
export function displayRoles(guildId: string): DisplayRole[] {
    const hit = cache.get(guildId);
    if (hit?.version === LarpStore.version) return hit.roles;

    const list = assignedRoles(guildId);
    const roles = list.map((role, index): DisplayRole => ({
        id: LARP_ROLE_PREFIX + role.id,
        name: role.name,
        guildId,
        color: colorNumber(role.color),
        colorString: role.color,
        colors: {
            primary_color: colorNumber(role.color),
            secondary_color: role.gradient ? colorNumber(role.gradient) : null,
            tertiary_color: null
        },
        colorStrings: {
            primaryColor: role.color,
            secondaryColor: role.gradient ?? null,
            tertiaryColor: null
        },
        position: 1_000_000 - index,
        hoist: false,
        managed: false,
        mentionable: false,
        icon: iconKey(role),
        unicodeEmoji: null,
        flags: 0,
        description: null,
        tags: {},
        larpRole: true
    }));

    cache.set(guildId, { version: LarpStore.version, roles });
    return roles;
}

/** Rollenliste eines Profil-Abschnitts um die Larp-Rollen ergänzen (nur eigener User, Regel 2) */
export function withLarpRoles<T>(roles: T[], guildId: unknown, userId: unknown): T[] {
    try {
        if (!Array.isArray(roles) || typeof guildId !== "string" || !isSelf(userId as string)) return roles;
        const own = displayRoles(guildId);
        if (!own.length) return roles;
        return [...own, ...roles.filter(r => !isLarpRole(r))] as unknown as T[];
    } catch (e) {
        logger.error("Larp-Rollen konnten nicht angezeigt werden", e);
        return roles;
    }
}

// ---- Namensfarbe ----

export interface ColorProps {
    colorString?: string | null;
    colorStrings?: { primaryColor?: string | null; secondaryColor?: string | null; tertiaryColor?: string | null; } | null;
    [key: string]: unknown;
}

/** Farben eines Props-Objekts durch die höchste Larp-Rolle ersetzen */
export function applyRoleColor<T extends ColorProps>(props: T, guildId: unknown, userId: unknown): T {
    try {
        if (!props || typeof guildId !== "string" || !isSelf(userId as string)) return props;
        const role = topColorRole(guildId);
        if (!role) return props;
        if (props.colorString === role.color && props.colorStrings?.secondaryColor === (role.gradient ?? null)) return props;
        return {
            ...props,
            colorString: role.color,
            colorStrings: { primaryColor: role.color, secondaryColor: role.gradient ?? null, tertiaryColor: null }
        };
    } catch (e) {
        logger.error("Namensfarbe konnte nicht gesetzt werden", e);
        return props;
    }
}

// ---- Vorlagen ----

export const ROLE_TEMPLATES = [
    { key: "owner", color: "#e74c3c" },
    { key: "admin", color: "#e67e22" },
    { key: "moderator", color: "#3498db" },
    { key: "vip", color: "#9b59b6" }
] as const;
