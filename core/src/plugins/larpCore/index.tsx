/*
 * Larpcord, a standalone Discord client for local cosmetic larping
 * Copyright (c) 2026 Larpcord contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./hub/styles.css";

import { BadgePosition, ProfileBadge } from "@api/Badges";
import SettingsPlugin from "@plugins/_core/settings";
import { Devs } from "@utils/constants";
import { removeFromArray } from "@utils/misc";
import definePlugin, { IconProps } from "@utils/types";
import { GuildStore, UserProfileStore, UserStore } from "@webpack/common";

import { Hub } from "./hub/Hub";
import { cancelPatchHealthCheck, schedulePatchHealthCheck } from "./patchHealth";
import { overrideProfile } from "./profileOverride";
import { isSelf, LarpStore, logger } from "./store";

const HUB_KEY = "larpcord_hub";

function MaskIcon({ width = 24, height = 24, className }: IconProps) {
    return (
        <svg width={width} height={height} viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
            <path d="M2 4.5C2 3.67 2.67 3 3.5 3c2.4.9 4.6.9 7 0 .83 0 1.5.67 1.5 1.5v4.3c0 3.7-2.2 6.2-5 6.2S2 12.5 2 8.8V4.5Zm2.7 3.3a.9.9 0 0 0 1.6.8.8.8 0 0 1 1.4 0 .9.9 0 0 0 1.6-.8 2.6 2.6 0 0 0-4.6 0Zm.2 3.4c.9 1.4 3.3 1.4 4.2 0H4.9Z" />
            <path d="M13 9.3V9c2.3.8 4.5.8 6.8 0 .7 0 1.2.5 1.2 1.2v4.1c0 3.7-2.2 6.2-5 6.2-2.3 0-4.2-1.7-4.8-4.3 1.6-1.3 2.6-3.6 2.6-6.9h-.8Zm2 3.7a.8.8 0 0 0 1.5.6.7.7 0 0 1 1.2 0 .8.8 0 0 0 1.5-.6 2.4 2.4 0 0 0-4.2 0Zm4.2 4.2c-.9-1.3-3.2-1.3-4.1 0h4.1Z" />
        </svg>
    );
}

/** Wasserzeichen als Badge-Komponente: nutzt Vencords Badge-API statt eines eigenen, fragilen Patches */
const WatermarkBadge: ProfileBadge = {
    id: "larpcord_watermark",
    key: "larpcord_watermark",
    description: "Dieses Profil wird mit Larpcord lokal verändert angezeigt",
    position: BadgePosition.END,
    shouldShow: ({ userId }) => isSelf(userId) && LarpStore.get().watermark,
    component: () => <span className="larp-watermark-badge" title="Lokal verändert mit Larpcord">🎭 Larpcord</span>
};

/**
 * Discord neu rendern lassen, wenn sich Larp-Einstellungen ändern. Es werden nur lokale
 * Flux-Stores angestoßen (emitChange), es gehen keine Requests raus.
 */
let refreshQueued = false;
export function refreshDiscordUi() {
    if (refreshQueued) return;
    refreshQueued = true;
    requestAnimationFrame(() => {
        refreshQueued = false;
        for (const store of [UserStore, UserProfileStore, GuildStore]) {
            try {
                store?.emitChange();
            } catch (e) {
                logger.warn("emitChange fehlgeschlagen", e);
            }
        }
    });
}

let unsubscribe: (() => void) | undefined;

export default definePlugin({
    name: "LarpCore",
    description: "Larpcord-Fundament: Einstellungs-Hub, Presets, Import/Export und Wasserzeichen. Alles bleibt lokal.",
    tags: ["Larpcord"],
    authors: [Devs.Larpcord],
    required: true,

    userProfileBadge: WatermarkBadge,

    patches: [
        {
            // Zentraler Profil-Hook (Nitro, Theme-Farben, Banner, Profileffekt), nur für den eigenen User
            find: 'displayName="UserProfileStore"',
            replacement: {
                match: /(?<=getUserProfile\((\i)\)\{return )(.+?)(?=\})/,
                replace: "$self.overrideProfile($1,$2)"
            }
        }
    ],

    overrideProfile,

    async start() {
        SettingsPlugin.customEntries.push({
            key: HUB_KEY,
            title: "Larpcord Hub",
            panelTitle: "Larpcord",
            Component: Hub,
            Icon: MaskIcon,
            position: "top"
        });

        unsubscribe = LarpStore.subscribe(refreshDiscordUi);
        schedulePatchHealthCheck();
        await LarpStore.init();
    },

    stop() {
        cancelPatchHealthCheck();
        removeFromArray(SettingsPlugin.customEntries, e => e.key === HUB_KEY);
        unsubscribe?.();
    }
});
