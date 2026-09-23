/*
 * Larpcord, a standalone Discord client for local cosmetic larping
 * Copyright (c) 2026 Larpcord contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { LarpStore, logger } from "@plugins/larpCore/store";
import { ServerLarp } from "@plugins/larpCore/types";
import { GuildStore } from "@webpack/common";

/*
 * Server lokal umgestalten: Name, Icon und Banner.
 *
 * Regel „Guild-Objekte im Store nicht dauerhaft verändern“: GuildStore.getGuild() liefert eine
 * *Kopie* mit denselben eigenen Feldern und demselben Prototyp, nur Name, Icon und Banner sind
 * ersetzt. Der Eintrag im Store bleibt unangetastet, und über guardGuildBody() kann ein
 * Larp-Wert nie in einem PATCH auf /guilds/<id> landen (Regel 1).
 *
 * Icon und Banner bekommen in der Kopie nur einen Platzhalter-Hash. Die echte URL setzen die
 * Patches auf getGuildIconURL/getGuildBannerURL ein, denn Discord baut daraus sonst eine CDN-URL.
 */

/** Platzhalter-Hash. Das führende „a_“ sorgt dafür, dass Discord animierte Bilder (GIF) zulässt. */
export const LARP_GUILD_HASH = "a_larpcord";

const ORIGINAL = Symbol("larpOriginalGuild");

export interface GuildLike {
    id: string;
    name?: string;
    icon?: string | null;
    banner?: string | null;
    features: Iterable<string>;
    premiumTier?: number;
    premiumSubscriberCount?: number;
    [ORIGINAL]?: GuildLike;
}

export function larpFor(guildId: string | null | undefined): ServerLarp | undefined {
    if (!guildId) return undefined;
    return LarpStore.get().servers[guildId];
}

/** Hat der Server lokale Anzeige-Änderungen? */
export function hasAppearance(larp: ServerLarp | undefined): boolean {
    return !!(larp?.name || larp?.iconUrl || larp?.bannerUrl);
}

/** Das echte Guild-Objekt hinter einer Anzeige-Kopie (oder das Objekt selbst) */
export function originalGuild<T extends GuildLike>(guild: T): T {
    return (guild?.[ORIGINAL] as T) ?? guild;
}

export function guildIconUrl(guildId: unknown): string | undefined {
    return typeof guildId === "string" ? larpFor(guildId)?.iconUrl : undefined;
}

export function guildBannerUrl(guildId: unknown): string | undefined {
    return typeof guildId === "string" ? larpFor(guildId)?.bannerUrl : undefined;
}

const cache = new WeakMap<object, { version: number; value: GuildLike; }>();

/**
 * Anzeige-Kopie einer Guild. Eigene Felder werden übernommen (damit `{...guild}` nichts verliert),
 * der Prototyp bleibt derselbe (damit Methoden und `instanceof` weiter funktionieren).
 */
export function displayGuild<T extends GuildLike>(guild: T): T {
    try {
        if (!guild || typeof guild !== "object") return guild;
        const larp = larpFor(guild.id);
        if (!larp) return guild;

        const hit = cache.get(guild);
        if (hit?.version === LarpStore.version) return hit.value as T;

        const overrides: Record<string | symbol, unknown> = {};
        const features = new Set(guild.features);
        if (larp.partner) features.add("PARTNERED");
        if (larp.verified) features.add("VERIFIED");
        if (features.size !== new Set(guild.features).size) overrides.features = features;
        if (larp.boostLevel != null) overrides.premiumTier = larp.boostLevel;
        if (larp.boostCount != null) {
            overrides.premiumSubscriberCount = larp.boostCount;
            overrides.premiumSubscriptionCount = larp.boostCount;
        }
        if (larp.name) overrides.name = larp.name;
        if (larp.iconUrl) overrides.icon = LARP_GUILD_HASH;
        if (larp.bannerUrl) overrides.banner = LARP_GUILD_HASH;

        if (!Object.keys(overrides).length) return guild;

        const value = Object.assign(Object.create(Object.getPrototypeOf(guild)), guild, overrides) as T;
        Object.defineProperty(value, ORIGINAL, { value: originalGuild(guild), enumerable: false });
        cache.set(guild, { version: LarpStore.version, value });
        return value;
    } catch (e) {
        logger.error("Anzeige-Kopie des Servers fehlgeschlagen", e);
        return guild;
    }
}

/**
 * Regel 1: Ein mit Larp-Werten vorausgefülltes Server-Formular darf sie nie an Discord senden.
 * Larp-Name und Platzhalter-Hashes werden durch die echten Werte ersetzt.
 */
export function guardGuildBody<T extends Record<string, any>>(guildId: unknown, body: T): T {
    try {
        if (!body || typeof body !== "object" || typeof guildId !== "string") return body;
        const larp = larpFor(guildId);
        if (!hasAppearance(larp)) return body;

        // Das echte Objekt steckt hinter der Anzeige-Kopie
        const real = originalGuild((GuildStore.getGuild(guildId) ?? {}) as GuildLike);

        const out: Record<string, any> = { ...body };
        const fixed: string[] = [];
        if (larp?.name && out.name === larp.name) {
            out.name = real.name;
            fixed.push("name");
        }
        for (const key of ["icon", "banner"] as const) {
            if (out[key] === LARP_GUILD_HASH) {
                out[key] = real[key] ?? null;
                fixed.push(key);
            }
        }
        if (!fixed.length) return body;

        logger.warn("Larp-Werte aus Server-Update entfernt:", fixed);
        return out as T;
    } catch (e) {
        logger.error("guardGuildBody", e);
        return body;
    }
}

const listCache = new WeakMap<object, { version: number; value: unknown; }>();

/** Wie displayGuild, aber für die gesamte Liste bzw. das gesamte Verzeichnis (Serverleiste, Ordner) */
function mapCached<T extends object>(source: T, map: (value: T) => T): T {
    try {
        if (!source || typeof source !== "object") return source;
        const hit = listCache.get(source);
        if (hit?.version === LarpStore.version) return hit.value as T;
        const value = map(source);
        listCache.set(source, { version: LarpStore.version, value });
        return value;
    } catch (e) {
        logger.error("Anzeige-Liste der Server fehlgeschlagen", e);
        return source;
    }
}

export function displayGuildRecord<T extends Record<string, GuildLike>>(record: T): T {
    return mapCached(record, r => {
        const out: Record<string, GuildLike> = {};
        for (const [id, guild] of Object.entries(r)) out[id] = displayGuild(guild);
        return out as T;
    });
}

export function displayGuildList<T extends GuildLike[]>(list: T): T {
    return mapCached(list, l => l.map(displayGuild) as T);
}
