/*
 * Larpcord, a standalone Discord client for local cosmetic larping
 * Copyright (c) 2026 Larpcord contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { registerHubTab, unregisterHubTab } from "@plugins/larpCore/hub/registry";
import { t } from "@plugins/larpCore/i18n";
import { isSelf, LarpStore, logger, remoteProfileFor,RemoteProfiles } from "@plugins/larpCore/store";
import { LarpProfile } from "@plugins/larpCore/types";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { findStoreLazy } from "@webpack";
import { PresenceStore } from "@webpack/common";
import { waitForStore } from "@webpack/common/internal";

import { activityConfig, buildActivities, clearAnchors, DiscordActivity, isLarpActivity as isOwnActivity, resolveAsset } from "./activities";
import { ActivityTab } from "./ActivityTab";

/*
 * Local display only (hard rule for this plugin):
 *
 * Discord sends its presence from SelfPresenceStore.getLocalPresence(). That method reads the
 * internal lists directly and is NOT touched here. Only the read methods the UI builds its
 * display from are wrapped:
 *   - SelfPresenceStore.getActivities()          → own activities in profile, member list, user panel
 *   - PresenceStore.getActivities(id, …)          → places that also go through the global store for the own user
 *   PresenceStore.findActivity(id, …) for the own user only sees the real activities: Discord uses it for
 *   functional lookups such as Go Live. getPrimaryActivity stays untouched.
 * Nobody but the own client sees the activity. getUnfilteredActivities stays untouched too, so
 * Discord's activity privacy settings keep showing the real applications.
 *
 * The methods are wrapped on the store instances at runtime instead of via regex patches: that
 * does not depend on the exact (minified) parameter list, which Discord changes from time to time
 * (e.g. getActivities(userId) → getActivities(userId, guildId = null)).
 */

const SelfPresenceStore = findStoreLazy("SelfPresenceStore");

/** Cache built lists: React compares store results by identity */
const cache = new WeakMap<object, { version: number; value: DiscordActivity[]; }>();

/** profile: whose larp activities to add (default: the own active larp account) */
function override(real: unknown, profile?: LarpProfile): unknown {
    try {
        if (!Array.isArray(real)) return real;
        const cfg = activityConfig(profile);
        // Nothing configured and no larp leftovers in the list: pass through unchanged
        if (!cfg && !real.some(isOwnActivity)) return real;

        const hit = cache.get(real);
        if (hit?.version === LarpStore.version) return hit.value;

        const value = buildActivities(real as DiscordActivity[], cfg);
        cache.set(real, { version: LarpStore.version, value });
        return value;
    } catch (e) {
        logger.error("Aktivitäten konnten nicht angepasst werden", e);
        return real;
    }
}

type AnyFn = (...args: any[]) => any;
/** Restores the original store methods in stop() */
const restorers: (() => void)[] = [];

/** Replaces store[method] with a wrapper. Missing method → feature disabled and logged (rule 6). */
function wrapMethod(store: any, storeName: string, method: string, make: (orig: AnyFn) => AnyFn) {
    const orig = store?.[method];
    if (typeof orig !== "function") {
        logger.warn(`${storeName}.${method} nicht gefunden, Larp-Aktivitäten sind dort inaktiv`);
        return;
    }
    // Already wrapped (e.g. plugin restarted before a waitForStore callback fired)
    if ((orig as { __larpWrapped?: boolean; }).__larpWrapped) return;
    const hadOwn = Object.prototype.hasOwnProperty.call(store, method);
    const wrapped = Object.assign(make(orig), { __larpWrapped: true });
    store[method] = wrapped;
    restorers.push(() => {
        if (store[method] !== wrapped) return;
        if (hadOwn) store[method] = orig;
        else delete store[method];
    });
}

function hookSelfPresenceStore(store: any) {
    wrapMethod(store, "SelfPresenceStore", "getActivities", orig => function (this: unknown, ...args: unknown[]) {
        return override(orig.apply(this, args));
    });
}

function hookPresenceStore(store: any) {
    const realGetActivities: AnyFn = store?.getActivities;
    wrapMethod(store, "PresenceStore", "getActivities", orig => function (this: unknown, ...args: unknown[]) {
        const real = orig.apply(this, args);
        const userId = args[0] as string;
        if (isSelf(userId)) return override(real);
        // Shared larp profile of another Larpcord user (larpSync): display only, like the own ones
        const remote = remoteProfileFor(userId);
        return remote ? override(real, remote) : real;
    });
    // findActivity is a functional lookup (e.g. Go Live looks for the running game to stream). For the own
    // user it only ever sees the real activities: a made-up one has no application behind it and made
    // "Share your screen" silently do nothing. getPrimaryActivity stays untouched as well.
    wrapMethod(store, "PresenceStore", "findActivity", orig => function (this: any, ...args: unknown[]) {
        try {
            const [userId, predicate, ...rest] = args;
            if (isSelf(userId as string) && typeof predicate === "function" && typeof realGetActivities === "function") {
                const real = realGetActivities.apply(store, [userId, ...rest]);
                if (Array.isArray(real)) return real.filter(a => !isOwnActivity(a)).find(predicate as AnyFn);
            }
        } catch (e) {
            logger.warn("findActivity-Override fehlgeschlagen", e);
        }
        return orig.apply(this, args);
    });
}

let unsubscribe: (() => void) | undefined;
let running = false;

/** Anzeige neu aufbauen lassen. Es werden nur lokale Flux-Stores angestoßen, nichts gesendet. */
function refreshPresence() {
    for (const store of [SelfPresenceStore, PresenceStore]) {
        try {
            store?.emitChange();
        } catch (e) {
            logger.warn("emitChange für Aktivitäten fehlgeschlagen", e);
        }
    }
}

export default definePlugin({
    name: "LarpActivity",
    get description() {
        return t("plugin.LarpActivity.description");
    },
    tags: ["Larpcord"],
    authors: [Devs.Larpcord],
    enabledByDefault: true,
    dependencies: ["LarpCore"],

    patches: [
        {
            // Bild-URLs: "larp:<schlüssel>" wird zur gespeicherten URL, bevor Discord nach einem Präfix sucht
            find: "getAssetImage: size must === [",
            replacement: {
                // Kein Rückverweis innerhalb eines Lookbehinds: JS wertet die von rechts nach links aus
                match: /if\(null!=(\i)&&\1\.includes\(":"\)\)\{/,
                replace: "$&const larpUrl=$self.assetUrl($1);if(larpUrl!=null)return larpUrl;"
            }
        },
        {
            // Discord blendet Aktivitäts-Knöpfe im eigenen Profil aus. Für Larp-Aktivitäten zeigen wir sie.
            find: ".USER_PROFILE_ACTIVITY_BUTTONS),",
            replacement: {
                match: /(\{user:(\i),activity:(\i),[^}]*\}=\i[\s\S]{0,400}?)(\i(?:\.\i)*\.getId\(\)===\2\.id)/,
                replace: "$1($4&&!$self.isLarpActivity($3))"
            }
        }
    ],

    assetUrl(asset: unknown) {
        try {
            return resolveAsset(asset);
        } catch {
            return undefined;
        }
    },

    isLarpActivity(activity: unknown) {
        try {
            return isOwnActivity(activity);
        } catch {
            return false;
        }
    },

    start() {
        registerHubTab({ id: "activity", title: "Activity", Component: ActivityTab });
        running = true;
        // The stores may load after the plugin starts; waitForStore also fires for already loaded ones
        waitForStore("SelfPresenceStore", store => {
            if (!running) return;
            hookSelfPresenceStore(store);
            refreshPresence();
        });
        waitForStore("PresenceStore", store => {
            if (!running) return;
            hookPresenceStore(store);
            refreshPresence();
        });
        // Own activities plus the shared ones of other Larpcord users (larpSync)
        const snapshot = () => JSON.stringify([
            LarpStore.get().activities ?? null,
            RemoteProfiles.ids().map(id => [id, remoteProfileFor(id)?.activities ?? null])
        ]);
        let last = snapshot();
        unsubscribe = LarpStore.subscribe(() => {
            const now = snapshot();
            if (now === last) return;
            last = now;
            refreshPresence();
        });
    },

    stop() {
        unregisterHubTab("activity");
        running = false;
        unsubscribe?.();
        for (const restore of restorers.splice(0)) restore();
        clearAnchors();
        refreshPresence();
    }
});
