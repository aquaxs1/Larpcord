/*
 * Larpcord, a standalone Discord client for local cosmetic larping
 * Copyright (c) 2026 Larpcord contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { userStyleRootNode } from "@api/Styles";
import { registerHubTab, unregisterHubTab } from "@plugins/larpCore/hub/registry";
import { LarpStore, logger } from "@plugins/larpCore/store";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

import { buildThemeCss } from "./themeCss";
import { ThemesTab } from "./ThemesTab";

/*
 * - Theme: CSS-Variablen in Vencords User-Style-Container (dort liegen auch QuickCSS und Themes)
 * - Sounds: eigene Dateien für Nachrichten- und Anruf-Sounds, lokal als data:-URL gespeichert
 */

const STYLE_ID = "larpcord-theme";
let unsubscribe: (() => void) | undefined;
let lastCss = "";

function applyTheme() {
    try {
        const css = buildThemeCss(LarpStore.get().theme);
        if (css === lastCss) return;
        lastCss = css;

        let style = document.getElementById(STYLE_ID) as HTMLStyleElement | null;
        if (!css) return void style?.remove();
        if (!style) {
            style = document.createElement("style");
            style.id = STYLE_ID;
            (userStyleRootNode.isConnected ? userStyleRootNode : document.head).append(style);
        }
        style.textContent = css;
    } catch (e) {
        logger.error("Theme konnte nicht angewendet werden", e);
    }
}

/** Discord-Soundnamen → Larp-Sound (auch Soundpack-Varianten wie "bit_message1") */
function soundKind(name: string): "message" | "call" | undefined {
    if (/(^|_)message1$/.test(name)) return "message";
    if (/call_(ringing|calling)/.test(name)) return "call";
    return undefined;
}

export default definePlugin({
    name: "LarpThemes",
    description: "Theme-Editor (Farben, Schrift, Rundungen) und eigene Sounds für Nachrichten und Anrufe.",
    tags: ["Larpcord"],
    authors: [Devs.Larpcord],
    enabledByDefault: true,
    dependencies: ["LarpCore"],

    patches: [
        {
            // Sound-Klasse: eigene Datei statt Discords Asset
            find: ".mp3`),",
            replacement: {
                match: /(?<=\.src=)(\i\(\d+\)\(`\.\/\$\{this\.name\}\.mp3`\))/,
                replace: "$self.getSound(this.name)??$1"
            }
        }
    ],

    getSound(name: string) {
        try {
            const kind = typeof name === "string" ? soundKind(name) : undefined;
            return kind ? LarpStore.get().sounds?.[kind] : undefined;
        } catch {
            return undefined;
        }
    },

    start() {
        registerHubTab({ id: "themes", title: "Themes", Component: ThemesTab });
        unsubscribe = LarpStore.subscribe(applyTheme);
        LarpStore.init().then(applyTheme);
    },

    stop() {
        unregisterHubTab("themes");
        unsubscribe?.();
        lastCss = "";
        document.getElementById(STYLE_ID)?.remove();
    }
});
