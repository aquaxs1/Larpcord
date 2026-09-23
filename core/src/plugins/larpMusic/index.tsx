/*
 * Larpcord, a standalone Discord client for local cosmetic larping
 * Copyright (c) 2026 Larpcord contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { BadgePosition, ProfileBadge } from "@api/Badges";
import { registerHubTab, unregisterHubTab } from "@plugins/larpCore/hub/registry";
import { t } from "@plugins/larpCore/i18n";
import { isSelf, LarpStore } from "@plugins/larpCore/store";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

import { dispose, refresh } from "./audio";
import { MiniPlayer } from "./MiniPlayer";
import { MusicTab } from "./MusicTab";

/*
 * Profil-Musik. Es gibt keinen Patch: Der Mini-Player hängt als Profil-Badge am eigenen Profil
 * (Vencords Badge-API). Er wird genau dann eingehängt, wenn das eigene Profil geöffnet ist, und
 * beim Schließen wieder entfernt – damit startet und stoppt die Wiedergabe von selbst.
 *
 * Die Songdatei liegt im Larpcord-Datenordner (Desktop-Teil, siehe desktop/src/main/larpMusic.ts),
 * nicht im DataStore. Im Profil anderer Nutzer passiert nichts, und es geht nichts nach außen.
 */

const MusicBadge: ProfileBadge = {
    id: "larpcord_music",
    key: "larpcord_music",
    get description() {
        return t("music.title");
    },
    position: BadgePosition.END,
    shouldShow: ({ userId }) => {
        if (!isSelf(userId)) return false;
        const { music } = LarpStore.get();
        return !!music?.enabled && !!music.source;
    },
    component: () => <MiniPlayer />
};

let unsubscribe: (() => void) | undefined;

export default definePlugin({
    name: "LarpMusic",
    get description() {
        return t("plugin.LarpMusic.description");
    },
    tags: ["Larpcord"],
    authors: [Devs.Larpcord],
    enabledByDefault: true,
    dependencies: ["LarpCore"],

    userProfileBadge: MusicBadge,

    start() {
        registerHubTab({ id: "music", title: "Musik", Component: MusicTab });

        let last = JSON.stringify(LarpStore.get().music ?? null);
        unsubscribe = LarpStore.subscribe(() => {
            const now = JSON.stringify(LarpStore.get().music ?? null);
            if (now === last) return;
            last = now;
            refresh();
        });
    },

    stop() {
        unregisterHubTab("music");
        unsubscribe?.();
        dispose();
    }
});
