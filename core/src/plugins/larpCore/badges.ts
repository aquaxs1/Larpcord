/*
 * Larpcord, a standalone Discord client for local cosmetic larping
 * Copyright (c) 2026 Larpcord contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { t } from "./i18n";

/**
 * Offizielle Discord-Badges.
 *
 * Discord liefert Badges als { id, description, icon } im Profil aus und baut die Bild-URL selbst:
 * `https://cdn.discordapp.com/badge-icons/<icon>.png`. Wir referenzieren also nur Discords eigene
 * Assets über ihren Hash, es liegen keine Icons im Repo.
 */
export interface OfficialBadge {
    /** Discords interne Badge-ID */
    id: string;
    /** Übersetzungsschlüssel des Tooltips */
    descriptionKey: string;
    /** Tooltip, wie Discord ihn anzeigt, in der aktuellen Sprache (wird bei jedem Lesen übersetzt) */
    readonly description: string;
    /** Hash für cdn.discordapp.com/badge-icons */
    icon: string;
    link?: string;
}

/** Tooltip nicht einfrieren: description ist ein Getter, damit ein Sprachwechsel sofort greift */
function official(badge: Omit<OfficialBadge, "description">): OfficialBadge {
    return {
        ...badge,
        get description() {
            return t(badge.descriptionKey);
        }
    };
}

export const OFFICIAL_BADGES: OfficialBadge[] = [
    official({ id: "staff", descriptionKey: "badge.staff", icon: "5e74e9b61934fc1f67c65515d1f7e60d", link: "https://discord.com/company" }),
    official({ id: "partner", descriptionKey: "badge.partner", icon: "3f9748e53446a137a052f3454e2de41e", link: "https://discord.com/partners" }),
    official({ id: "certified_moderator", descriptionKey: "badge.certifiedModerator", icon: "fee1624003e2fee35cb398e125dc479b", link: "https://discord.com/safety" }),
    official({ id: "hypesquad", descriptionKey: "badge.hypesquadEvents", icon: "bf01d1073931f921909045f3a39fd264", link: "https://support.discord.com/hc/en-us/articles/360035962891-Profile-Badges-101#h_01GM67K5EJ16ZHYZQ5MPRW3JT3" }),
    official({ id: "hypesquad_house_1", descriptionKey: "badge.hypesquadBravery", icon: "8a88d63823d8a71cd5e390baa45efa02", link: "https://discord.com/settings/hypesquad-online" }),
    official({ id: "hypesquad_house_2", descriptionKey: "badge.hypesquadBrilliance", icon: "011940fd013da3f7fb926e4a1cd2e618", link: "https://discord.com/settings/hypesquad-online" }),
    official({ id: "hypesquad_house_3", descriptionKey: "badge.hypesquadBalance", icon: "3aa41de486fa12454c3761e8e223442e", link: "https://discord.com/settings/hypesquad-online" }),
    official({ id: "bug_hunter_level_1", descriptionKey: "badge.bugHunter", icon: "2717692c7dca7289b35297368a940dd0", link: "https://support.discord.com/hc/en-us/articles/360046057772-Discord-Bugs" }),
    official({ id: "bug_hunter_level_2", descriptionKey: "badge.bugHunter", icon: "848f79194d4be5ff5f81505cbd0ce1e6", link: "https://support.discord.com/hc/en-us/articles/360046057772-Discord-Bugs" }),
    official({ id: "active_developer", descriptionKey: "badge.activeDeveloper", icon: "6bdc42827a38498929a4920da12695d9", link: "https://support-dev.discord.com/hc/en-us/articles/10113997751447?ref=badge" }),
    official({ id: "verified_developer", descriptionKey: "badge.verifiedDeveloper", icon: "6df5892e0f35b051f8b61eace34f4967" }),
    official({ id: "early_supporter", descriptionKey: "badge.earlySupporter", icon: "7060786766c9c840eb3019e725d2b358", link: "https://discord.com/settings/premium" }),
    official({ id: "legacy_username", descriptionKey: "badge.legacyUsername", icon: "6de6d34650760ba5551a79732e98ed60" }),
    official({ id: "quest_completed", descriptionKey: "badge.questCompleted", icon: "7d9ae358c8c5e118768335dbe68b4fb8", link: "https://discord.com/discovery/quests" }),
];

/** Nitro-Tenure-Badges (ab Monat X), berechnet aus nitro.since */
export const NITRO_TENURE_BADGES = [
    { months: 72, id: "premium_tenure_72_month_v2", name: "Opal", icon: "5b154df19c53dce2af92c9b61e6be5e2" },
    { months: 60, id: "premium_tenure_60_month_v2", name: "Ruby", icon: "cd5e2cfd9d7f27a8cdcd3e8a8d5dc9f4" },
    { months: 36, id: "premium_tenure_36_month_v2", name: "Emerald", icon: "11e2d339068b55d3a506cff34d3780f3" },
    { months: 24, id: "premium_tenure_24_month_v2", name: "Diamond", icon: "0d61871f72bb9a33a7ae568c1fb4f20a" },
    { months: 12, id: "premium_tenure_12_month_v2", name: "Platinum", icon: "0334688279c8359120922938dcb1d6f8" },
    { months: 6, id: "premium_tenure_6_month_v2", name: "Gold", icon: "2895086c18d5531d499862e41d1155a6" },
    { months: 3, id: "premium_tenure_3_month_v2", name: "Silver", icon: "4514fab914bdbfb4ad2fa23df76121a6" },
    { months: 1, id: "premium_tenure_1_month_v2", name: "Bronze", icon: "4f33c4a9c64ce221936bd256c356f91f" },
] as const;

/** Klassisches Nitro-Badge (unter einem Monat) */
export const NITRO_BADGE = { id: "premium", icon: "2ba85e8026a8614b640c2837bcdfe21b" } as const;

/** Server-Boost-Badges, Stufe nach Boost-Dauer in Monaten */
export const BOOST_BADGES = [
    { months: 24, level: 9, icon: "ec92202290b48d0879b7413d2dde3bab" },
    { months: 18, level: 8, icon: "7142225d31238f6387d9f09efaa02759" },
    { months: 15, level: 7, icon: "cb3ae83c15e970e8f3d410bc62cb8b99" },
    { months: 12, level: 6, icon: "991c9f39ee33d7537d9f408c3e53141e" },
    { months: 9, level: 5, icon: "996b3e870e8a22ce519b3a50e6bdd52f" },
    { months: 6, level: 4, icon: "df199d2050d3ed4ebf84d64ae83989f8" },
    { months: 3, level: 3, icon: "72bed924410c304dbe3d00a6e593ff59" },
    { months: 2, level: 2, icon: "0e4080d1d333bc7ad29ef6528b6f2fb7" },
    { months: 0, level: 1, icon: "51040c70d4f20a921ad6674ff86fc95c" },
] as const;

export const OFFICIAL_BADGE_IDS = new Set(OFFICIAL_BADGES.map(b => b.id));

export function badgeIconUrl(icon: string) {
    return `https://cdn.discordapp.com/badge-icons/${icon}.png`;
}

/** Volle Monate zwischen einem ISO-Datum und jetzt */
export function monthsSince(iso: string | undefined, now = new Date()) {
    if (!iso) return 0;
    const d = new Date(iso);
    if (isNaN(d.getTime())) return 0;
    let months = (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
    if (now.getDate() < d.getDate()) months--;
    return Math.max(0, months);
}
