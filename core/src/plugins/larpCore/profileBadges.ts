/*
 * Larpcord, a standalone Discord client for local cosmetic larping
 * Copyright (c) 2026 Larpcord contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { badgeIconUrl, BOOST_BADGES, monthsSince, NITRO_BADGE, NITRO_TENURE_BADGES, OFFICIAL_BADGES } from "./badges";
import { LarpProfile } from "./types";

export interface LarpBadge {
    /** Schlüssel für die Sortierung: Badge-ID, "nitro", "boost" oder "custom:<id>" */
    key: string;
    /** ID, wie Discord sie im Profil erwartet */
    id: string;
    description: string;
    iconUrl: string;
    /** Hash für Discords badge-icons (nur offizielle Badges) */
    icon?: string;
    link?: string;
    kind: "official" | "nitro" | "boost" | "custom";
}

const isGerman = () => (document.documentElement.lang || navigator.language || "").toLowerCase().startsWith("de");

export function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString(isGerman() ? "de-DE" : "en-US", { year: "numeric", month: "short", day: "numeric" });
}

export function getNitroBadge(profile: LarpProfile): LarpBadge | undefined {
    if (!profile.nitro.enabled) return;
    const since = profile.nitro.since ?? new Date().toISOString();
    const months = monthsSince(since);
    const tier = NITRO_TENURE_BADGES.find(t => months >= t.months);
    const icon = tier?.icon ?? NITRO_BADGE.icon;
    return {
        key: "nitro",
        id: tier?.id ?? NITRO_BADGE.id,
        description: `${isGerman() ? "Abonnent seit" : "Subscriber since"} ${formatDate(since)}`,
        icon,
        iconUrl: badgeIconUrl(icon),
        link: "https://discord.com/settings/premium",
        kind: "nitro"
    };
}

export function getBoostBadge(profile: LarpProfile): LarpBadge | undefined {
    const since = profile.nitro.boostSince;
    if (!profile.nitro.enabled || !since) return;
    const months = monthsSince(since);
    const tier = BOOST_BADGES.find(b => months >= b.months) ?? BOOST_BADGES[BOOST_BADGES.length - 1];
    return {
        key: "boost",
        id: `guild_booster_lvl${tier.level}`,
        description: `${isGerman() ? "Server-Boost seit" : "Server boosting since"} ${formatDate(since)}`,
        icon: tier.icon,
        iconUrl: badgeIconUrl(tier.icon),
        link: "https://discord.com/settings/premium",
        kind: "boost"
    };
}

/** Alle Larp-Badges des Profils in der vom Nutzer gewählten Reihenfolge */
export function getLarpBadges(profile: LarpProfile): LarpBadge[] {
    const all: LarpBadge[] = [];

    for (const b of OFFICIAL_BADGES) {
        if (!profile.badges.builtin.includes(b.id)) continue;
        all.push({ key: b.id, id: b.id, description: b.description, icon: b.icon, iconUrl: badgeIconUrl(b.icon), link: b.link, kind: "official" });
    }

    const nitro = getNitroBadge(profile);
    if (nitro) all.push(nitro);
    const boost = getBoostBadge(profile);
    if (boost) all.push(boost);

    for (const c of profile.badges.custom) {
        all.push({ key: `custom:${c.id}`, id: `larpcord_custom_${c.id}`, description: c.tooltip, iconUrl: c.imageUrl, kind: "custom" });
    }

    const order = profile.badgeOrder ?? [];
    const rank = new Map(all.map((b, natural) => {
        const i = order.indexOf(b.key);
        return [b.key, i === -1 ? order.length + natural : i];
    }));
    return all.sort((a, b) => rank.get(a.key)! - rank.get(b.key)!);
}
