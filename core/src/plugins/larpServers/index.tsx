/*
 * Larpcord, a standalone Discord client for local cosmetic larping
 * Copyright (c) 2026 Larpcord contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { registerHubTab, unregisterHubTab } from "@plugins/larpCore/hub/registry";
import { LarpStore, logger } from "@plugins/larpCore/store";
import { ServerLarp } from "@plugins/larpCore/types";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

import { ServersTab } from "./ServersTab";

/*
 * Regel 3: Server-Badges sind reine Anzeige. Die Guild selbst (features, premiumTier …) bleibt
 * unverändert, denn davon hängen echte Funktionen ab (Upload-Limits, Emoji-Slots, Vanity-URL …).
 * Stattdessen bekommen nur die Anzeige-Komponenten eine lokale "Anzeige-Kopie" der Guild.
 */

interface GuildLike {
    id: string;
    features: Iterable<string>;
    premiumTier?: number;
    premiumSubscriberCount?: number;
}

const cache = new WeakMap<object, { version: number; value: any; }>();

function larpFor(guild: GuildLike | null | undefined): ServerLarp | undefined {
    if (!guild?.id) return undefined;
    return LarpStore.get().servers[guild.id];
}

function displayFeatureSet(guild: GuildLike, larp: ServerLarp) {
    const features = new Set(guild.features);
    if (larp.partner) features.add("PARTNERED");
    if (larp.verified) features.add("VERIFIED");
    return features;
}

export default definePlugin({
    name: "LarpServers",
    description: "Partner-/Verified-Abzeichen sowie Boost-Stufe und -Anzahl pro Server, rein als lokale Anzeige.",
    tags: ["Larpcord"],
    authors: [Devs.Larpcord],
    enabledByDefault: true,
    dependencies: ["LarpCore"],

    patches: [
        {
            // Guild-Badge (Server-Header, Tooltip der Serverleiste): lokale Kopie der Features
            find: ".INTERNAL_EMPLOYEE_ONLY)?this.renderBadge(",
            replacement: {
                match: /(?<=render\(\)\{let\{guild:(\i)\}=this\.props,\i=)new Set\(\1\.features\)/,
                replace: "$self.displayFeatures($1)"
            }
        },
        {
            // Abgeleitete Anzeige-Infos einer Guild (Badge-Typ, Boost-Stufe/-Anzahl)
            find: /="INVITE_ONLY";\i\.has\(/,
            replacement: {
                match: /(function \i\((\i)\)\{)(?=var \i;let \i=new Set\(\2\.features\))/,
                replace: "$1$2=$self.displayGuild($2);"
            }
        },
        {
            // Server-Header: Badge statt Boost-Gem, bzw. Boost-Gem mit Stufe und Anzahl
            find: /premiumSubscriberCount:\i\}=\i;if\(0===\i&&/,
            replacement: [
                {
                    match: /(?<=\{premiumTier:\i,premiumSubscriberCount:\i\}=)(\i)(?=;if\(0===)/,
                    replace: "$self.displayGuild($1)"
                },
                {
                    match: /(\i)\.features\.has\(\i\.GuildFeatures\.VERIFIED\)\|\|/,
                    replace: "$self.hasDisplayBadge($1)||$&"
                }
            ]
        },
        {
            // Guild-Info-Karte (z. B. Tooltip/Einladung): Badge anzeigen
            find: /customSubtext:\i\}=\i/,
            replacement: {
                match: /(?<=let \i=)(?=(\i)\.features\.has\(\i\.GuildFeatures\.VERIFIED\)\|\|)/,
                replace: "$self.hasDisplayBadge($1)||"
            }
        }
    ],

    displayFeatures(guild: GuildLike) {
        try {
            const larp = larpFor(guild);
            return larp ? displayFeatureSet(guild, larp) : new Set(guild.features);
        } catch (e) {
            logger.error("displayFeatures", e);
            return new Set(guild?.features ?? []);
        }
    },

    hasDisplayBadge(guild: GuildLike) {
        try {
            const larp = larpFor(guild);
            return !!(larp?.partner || larp?.verified);
        } catch {
            return false;
        }
    },

    /** Anzeige-Kopie: erbt alles von der echten Guild (Prototyp), überschreibt nur Anzeige-Felder */
    displayGuild<T extends GuildLike>(guild: T): T {
        try {
            const larp = larpFor(guild);
            if (!larp || typeof guild !== "object") return guild;

            const hit = cache.get(guild);
            if (hit?.version === LarpStore.version) return hit.value;

            const overrides: Record<string, unknown> = { features: displayFeatureSet(guild, larp) };
            if (larp.boostLevel != null) overrides.premiumTier = larp.boostLevel;
            if (larp.boostCount != null) {
                overrides.premiumSubscriberCount = larp.boostCount;
                overrides.premiumSubscriptionCount = larp.boostCount;
            }
            const value = Object.assign(Object.create(guild), overrides);
            cache.set(guild, { version: LarpStore.version, value });
            return value;
        } catch (e) {
            logger.error("displayGuild", e);
            return guild;
        }
    },

    start() {
        registerHubTab({ id: "servers", title: "Server", Component: ServersTab });
    },

    stop() {
        unregisterHubTab("servers");
    }
});
