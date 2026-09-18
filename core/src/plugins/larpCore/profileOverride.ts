/*
 * Larpcord, a standalone Discord client for local cosmetic larping
 * Copyright (c) 2026 Larpcord contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { isPluginEnabled } from "@api/PluginManager";
import virtualMerge from "virtual-merge";

import { isSelf, LarpStore, logger } from "./store";

/*
 * Zentraler Hook auf UserProfileStore.getUserProfile(). Discord baut daraus das angezeigte Profil
 * (Nitro-Datum, Boost-Datum, Theme-Farben, Banner, Profileffekt). Wir liefern für den eigenen User
 * eine lokal veränderte Kopie zurück. Das Original im Store bleibt unangetastet.
 *
 * Die Felder gehören zu verschiedenen Plugins und werden nur gesetzt, wenn das Plugin aktiv ist.
 */

export const LARP_BANNER_PLACEHOLDER = "larpcord_banner";

const enabled = (name: string) => {
    try {
        return isPluginEnabled(name);
    } catch {
        return false;
    }
};

const hexToInt = (hex: string) => parseInt(hex.slice(1), 16);

// Pro Original-Profil und Store-Version cachen, damit Discord stabile Objekte bekommt (weniger Re-Renders)
const cache = new WeakMap<object, { version: number; result: any; }>();

export function overrideProfile(userId: string, profile: any) {
    if (profile == null || !isSelf(userId)) return profile;

    try {
        const hit = cache.get(profile);
        if (hit?.version === LarpStore.version) return hit.result;

        const larp = LarpStore.get();
        const patch: Record<string, unknown> = {};

        if (enabled("LarpNitro")) {
            if (larp.nitro.enabled) {
                patch.premiumSince = new Date(larp.nitro.since ?? Date.now());
                if (larp.nitro.boostSince) patch.premiumGuildSince = new Date(larp.nitro.boostSince);
            }
            if (larp.profile.themeColors) patch.themeColors = larp.profile.themeColors.map(hexToInt);
            if (larp.profile.bannerUrl) patch.banner = LARP_BANNER_PLACEHOLDER;
            // Nur das *Anzeige*-Profil bekommt Nitro-Stufe 2, damit Discord Farben/Banner rendert.
            // Das User-Objekt (und damit Nitro-Funktionen, die der Server prüft) bleibt unverändert.
            if (larp.nitro.enabled || larp.profile.themeColors || larp.profile.bannerUrl)
                patch.premiumType = Math.max(profile.premiumType ?? 0, 2);
        }

        if (enabled("LarpDecorations") && larp.profileEffect) {
            patch.profileEffect = { skuId: larp.profileEffect };
        }

        // virtualMerge liest nicht überschriebene Felder live aus dem Original (Discord mutiert Profile teils in-place)
        const result = Object.keys(patch).length ? virtualMerge(profile, patch) : profile;
        cache.set(profile, { version: LarpStore.version, result });
        return result;
    } catch (e) {
        logger.error("Profil-Override fehlgeschlagen", e);
        return profile;
    }
}
