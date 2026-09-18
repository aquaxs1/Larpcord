/*
 * Larpcord, a standalone Discord client for local cosmetic larping
 * Copyright (c) 2026 Larpcord contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { registerHubTab, unregisterHubTab } from "@plugins/larpCore/hub/registry";
import { isSelf, LarpStore } from "@plugins/larpCore/store";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

import { NitroTab } from "./NitroTab";

/*
 * Nitro-Optik, rein lokal:
 * - Nitro- und Boost-Badge (berechnet in larpCore/profileBadges, angezeigt über LarpBadges)
 * - Nitro-/Boost-Datum, Theme-Farben und Banner über den Profil-Hook in larpCore
 * - Banner-URL und animierter Avatar über die beiden Patches unten
 *
 * Bewusst NICHT: Nitro-Funktionen, die der Server prüft (Uploads, Streaming, Emojis …).
 * Das User-Objekt bekommt daher kein premiumType, nur das Anzeige-Profil.
 */

export default definePlugin({
    name: "LarpNitro",
    description: "Lokale Nitro-Optik für dein eigenes Profil: Nitro-/Boost-Badge mit Datum, Theme-Farben, Banner und animierter Avatar.",
    tags: ["Larpcord"],
    authors: [Devs.Larpcord],
    enabledByDefault: true,
    dependencies: ["LarpCore"],

    patches: [
        {
            // DisplayProfile.getBannerURL: eigenes Banner statt Discords CDN-Hash
            find: "getLegacyUsername(){",
            replacement: {
                match: /getBannerURL\((\i)\)\{/,
                replace: "$&{const larpBanner=$self.getBannerOverride(this.userId);if(larpBanner)return larpBanner;}"
            }
        },
        {
            // IconUtils.getUserAvatarURL: eigener (animierter) Avatar
            find: "getUserAvatarURL:",
            replacement: {
                match: /(?<=function \i\((\i)\)\{)(?=let\{id:\i,avatar:\i,discriminator:\i,bot:\i\}=\1)/,
                replace: "const larpAvatar=$self.getAvatarOverride($1);if(larpAvatar)return larpAvatar;"
            }
        }
    ],

    getBannerOverride(userId: string) {
        try {
            return isSelf(userId) ? LarpStore.get().profile.bannerUrl : undefined;
        } catch {
            return undefined;
        }
    },

    getAvatarOverride(user: { id?: string; } | null | undefined) {
        try {
            return isSelf(user?.id) ? LarpStore.get().profile.animatedAvatarUrl : undefined;
        } catch {
            return undefined;
        }
    },

    start() {
        registerHubTab({ id: "nitro", title: "Nitro", Component: NitroTab });
    },

    stop() {
        unregisterHubTab("nitro");
    }
});
