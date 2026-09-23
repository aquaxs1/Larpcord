/*
 * Larpcord, a standalone Discord client for local cosmetic larping
 * Copyright (c) 2026 Larpcord contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { registerHubTab, unregisterHubTab } from "@plugins/larpCore/hub/registry";
import { t } from "@plugins/larpCore/i18n";
import { isSelf, LarpStore, logger } from "@plugins/larpCore/store";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { findStoreLazy } from "@webpack";
import { PresenceStore } from "@webpack/common";

import { activityConfig, buildActivities, clearAnchors, DiscordActivity, isLarpActivity as isOwnActivity, resolveAsset } from "./activities";
import { ActivityTab } from "./ActivityTab";

/*
 * Nur lokale Anzeige (harte Regel für dieses Plugin):
 *
 * Discord sendet seine Präsenz aus SelfPresenceStore.getLocalPresence(). Diese Methode liest die
 * internen Listen direkt und wird hier NICHT angefasst. Gepatcht werden ausschließlich die
 * Lese-Methoden, aus denen die Oberfläche ihre Anzeige baut:
 *   - SelfPresenceStore.getActivities()  → eigene Aktivitäten in Profil, Mitgliederliste, User-Panel
 *   - PresenceStore.getActivities(id)    → Stellen, die auch beim eigenen User über den globalen Store gehen
 * Dadurch sieht die Aktivität niemand außer dem eigenen Client. getUnfilteredActivities bleibt
 * ebenfalls unangetastet, damit Discords Aktivitäts-Datenschutz weiter die echten Anwendungen zeigt.
 */

const SelfPresenceStore = findStoreLazy("SelfPresenceStore");

/** Gebaute Listen zwischenspeichern: React vergleicht Store-Ergebnisse über die Identität */
const cache = new WeakMap<object, { version: number; value: DiscordActivity[]; }>();

function override(real: unknown): unknown {
    try {
        if (!Array.isArray(real)) return real;
        const cfg = activityConfig();
        // Nichts eingerichtet und keine Larp-Reste in der Liste: unverändert durchreichen
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

let unsubscribe: (() => void) | undefined;

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
            // Eigene Aktivitäten: Anzeige-Liste des eigenen Users (getLocalPresence bleibt unberührt)
            find: 'displayName="SelfPresenceStore"',
            replacement: {
                match: /(?<=\})getActivities\(\)\{/,
                replace: "getActivities(){return $self.overrideOwn(this.__larpGetActivities(...arguments))}__larpGetActivities(){"
            }
        },
        {
            // Gleiches für Stellen, die auch beim eigenen User über den globalen Präsenz-Store gehen
            find: 'displayName="PresenceStore"',
            replacement: {
                match: /(?<=\})getActivities\((\i)\)\{/,
                replace: "getActivities($1){return $self.overrideFor(this.__larpGetActivities(...arguments),$1)}__larpGetActivities($1){"
            }
        },
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

    /** SelfPresenceStore.getActivities() – immer der eigene User */
    overrideOwn(real: unknown) {
        return override(real);
    },

    /** PresenceStore.getActivities(userId) – nur der eigene User (Regel 2) */
    overrideFor(real: unknown, userId: string) {
        return isSelf(userId) ? override(real) : real;
    },

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
        registerHubTab({ id: "activity", title: "Aktivität", Component: ActivityTab });
        let last = JSON.stringify(LarpStore.get().activities ?? null);
        unsubscribe = LarpStore.subscribe(() => {
            const now = JSON.stringify(LarpStore.get().activities ?? null);
            if (now === last) return;
            last = now;
            refreshPresence();
        });
    },

    stop() {
        unregisterHubTab("activity");
        unsubscribe?.();
        clearAnchors();
        refreshPresence();
    }
});
