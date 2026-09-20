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
import * as i18n from "./i18n";
import { LARPCORD_LOGO } from "./logo";
import { cancelPatchHealthCheck, schedulePatchHealthCheck } from "./patchHealth";
import { overrideProfile } from "./profileOverride";
import { isSelf, LarpStore, logger } from "./store";
import { startUpdaterClient, stopUpdaterClient } from "./updater/client";
import { watchForDownloadedUpdates } from "./updater/UpdateModal";

const HUB_KEY = "larpcord_hub";

function LarpcordIcon({ width = 24, height = 24, className }: IconProps) {
    return <img src={LARPCORD_LOGO} width={width} height={height} className={className} alt="" draggable={false} />;
}

/**
 * Wasserzeichen als Badge-Komponente: nutzt Vencords Badge-API statt eines eigenen, fragilen Patches.
 * description ist ein Getter, Vencord liest ihn bei jedem Rendern (Sprachwechsel greift sofort).
 */
const WatermarkBadge: ProfileBadge = {
    id: "larpcord_watermark",
    key: "larpcord_watermark",
    get description() {
        return i18n.t("core.watermark.description");
    },
    position: BadgePosition.END,
    shouldShow: ({ userId }) => isSelf(userId) && LarpStore.get().watermark,
    component: () => (
        <span className="larp-watermark-badge" title={i18n.t("core.watermark.title")}>
            <img src={LARPCORD_LOGO} alt="" draggable={false} /> Larpcord
        </span>
    )
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
let unsubscribeLocale: (() => void) | undefined;
let unsubscribeUpdates: (() => void) | undefined;

/** Discord-Sprache an den Desktop-Teil melden (Tray, Dialoge, Splash). Ohne Desktop (Web) passiert nichts. */
function reportLocaleToDesktop() {
    try {
        if (IS_VESKTOP) VesktopNative?.larpcord?.setLocale?.(i18n.getIntlLocale())?.catch?.(() => { });
    } catch (e) {
        logger.warn("Sprache konnte nicht an den Desktop-Teil gemeldet werden", e);
    }
}

/**
 * Ergebnis des Onboardings (erster Start) übernehmen: Start-Preset und Wasserzeichen.
 * Der Desktop-Teil legt es als State.pendingOnboarding ab, hier wird es genau einmal abgeholt
 * (consumeOnboarding() leert den Wert dabei). Fehler werden nur geloggt, nichts darf den Client blockieren.
 */
async function applyPendingOnboarding() {
    try {
        if (!IS_VESKTOP) return;
        const consume = VesktopNative?.larpcord?.consumeOnboarding;
        if (typeof consume !== "function") return;

        const pending = await consume();
        if (!pending) return;

        if (pending.preset) {
            try {
                LarpStore.loadPreset(`builtin:${pending.preset}`);
            } catch (e) {
                logger.warn("Start-Preset aus dem Onboarding konnte nicht geladen werden", e);
            }
        }
        // update() vergisst das aktive Preset (jede Änderung ist eine Abweichung davon),
        // deshalb nur schreiben, wenn sich der Wert wirklich unterscheidet.
        const watermark = !!pending.watermark;
        if (LarpStore.get().watermark !== watermark) LarpStore.update({ watermark });
    } catch (e) {
        logger.warn("Onboarding-Einstellungen konnten nicht übernommen werden", e);
    }
}

export default definePlugin({
    name: "LarpCore",
    get description() {
        return i18n.t("plugin.LarpCore.description");
    },
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

    /** i18n-API für den Desktop-Renderer (desktop/src/renderer) und Konsolen-Tests */
    i18n,

    async start() {
        SettingsPlugin.customEntries.push({
            key: HUB_KEY,
            // Getter: _core/settings liest den Titel erst beim Rendern, so folgt er Discords Sprache
            get title() {
                return i18n.t("core.settings.hubTitle");
            },
            panelTitle: "Larpcord",
            Component: Hub,
            Icon: LarpcordIcon,
            position: "top"
        });

        unsubscribeLocale = i18n.onLocaleChange(() => {
            refreshDiscordUi();
            reportLocaleToDesktop();
        });
        i18n.startI18n();

        unsubscribeUpdates = watchForDownloadedUpdates();
        startUpdaterClient();

        unsubscribe = LarpStore.subscribe(refreshDiscordUi);
        schedulePatchHealthCheck();
        await LarpStore.init();
        await applyPendingOnboarding();
    },

    stop() {
        cancelPatchHealthCheck();
        removeFromArray(SettingsPlugin.customEntries, e => e.key === HUB_KEY);
        unsubscribe?.();
        unsubscribeLocale?.();
        unsubscribeUpdates?.();
        stopUpdaterClient();
        i18n.stopI18n();
    }
});
