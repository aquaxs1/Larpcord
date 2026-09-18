/*
 * Larpcord, a standalone Discord client for local cosmetic larping
 * Copyright (c) 2026 Larpcord contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { BadgePosition, ProfileBadge } from "@api/Badges";
import { isPluginEnabled } from "@api/PluginManager";
import { registerHubTab, unregisterHubTab } from "@plugins/larpCore/hub/registry";
import { getLarpBadges } from "@plugins/larpCore/profileBadges";
import { isSelf, LarpStore, logger } from "@plugins/larpCore/store";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

import { BadgesTab } from "./BadgesTab";

/** Nitro-/Boost-Badges gehören zu LarpNitro und erscheinen nur, wenn das Plugin aktiv ist */
const nitroActive = () => {
    try {
        return isPluginEnabled("LarpNitro");
    } catch {
        return false;
    }
};

const LarpBadges: ProfileBadge = {
    id: "larpcord_badges",
    position: BadgePosition.START,
    shouldShow: ({ userId }) => isSelf(userId),
    getBadges({ userId }) {
        if (!isSelf(userId)) return [];
        try {
            const withNitro = nitroActive();
            return getLarpBadges(LarpStore.get())
                .filter(b => withNitro || (b.kind !== "nitro" && b.kind !== "boost"))
                .map(b => ({
                    id: b.id,
                    key: b.id,
                    description: b.description,
                    iconSrc: b.iconUrl,
                    link: b.link,
                    position: BadgePosition.START
                }));
        } catch (e) {
            logger.error("Badges konnten nicht berechnet werden", e);
            return [];
        }
    }
};

export default definePlugin({
    name: "LarpBadges",
    description: "Offizielle und eigene Badges sowie ein frei wählbares „Mitglied seit“-Datum für dein eigenes Profil. Nur lokal sichtbar.",
    tags: ["Larpcord"],
    authors: [Devs.Larpcord],
    enabledByDefault: true,
    dependencies: ["LarpCore"],

    userProfileBadge: LarpBadges,

    patches: [
        {
            // „Mitglied seit“ im Profil: Discord berechnet das Datum aus der User-ID (Snowflake)
            find: /tooltipDelay:.{0,400}\.extractTimestamp\(/,
            replacement: {
                match: /(\i\.default\.extractTimestamp\((\i)\))/,
                replace: "$self.getMemberSince($2,$1)"
            }
        }
    ],

    /** Regel 2: nur für den eigenen User, sonst Discords Originalwert */
    getMemberSince(userId: string, original: number) {
        try {
            if (!isSelf(userId)) return original;
            const { memberSince } = LarpStore.get();
            const t = memberSince ? Date.parse(memberSince) : NaN;
            return isNaN(t) ? original : t;
        } catch {
            return original;
        }
    },

    start() {
        registerHubTab({ id: "badges", title: "Badges", Component: BadgesTab });
    },

    stop() {
        unregisterHubTab("badges");
    }
});
