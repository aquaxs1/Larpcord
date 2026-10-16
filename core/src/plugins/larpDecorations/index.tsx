/*
 * Larpcord, a standalone Discord client for local cosmetic larping
 * Copyright (c) 2026 Larpcord contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { registerHubTab, unregisterHubTab } from "@plugins/larpCore/hub/registry";
import { t } from "@plugins/larpCore/i18n";
import { isSelf, LarpStore } from "@plugins/larpCore/store";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

import { DecorationsTab } from "./DecorationsTab";

/*
 * Avatar-Dekoration und Nameplate liest Discord über Getter am User-Modell (user.avatarDecoration,
 * user.nameplate). Wir biegen nur diese beiden Getter für den eigenen User um, das User-Objekt
 * selbst und der Server bleiben unberührt. Profileffekte laufen über den Profil-Hook in larpCore.
 */

let decoCache: { key: string; value: any; } | undefined;
let nameplateCache: { key: string; value: any; } | undefined;

export default definePlugin({
    name: "LarpDecorations",
    get description() {
        return t("plugin.LarpDecorations.description");
    },
    tags: ["Larpcord"],
    authors: [Devs.Larpcord],
    enabledByDefault: true,
    dependencies: ["LarpCore"],

    patches: [
        {
            find: "get avatarDecoration(){",
            replacement: [
                {
                    match: /get avatarDecoration\(\)\{return (this\.avatarDecorationData)\}/,
                    replace: "get avatarDecoration(){return $self.getDecoration(this,$1)}"
                },
                {
                    match: /(get nameplate\(\)\{return\(0,\i\.\i\)\()(this\.collectibles\?\.nameplate)(?=\))/,
                    replace: "$1$self.getNameplate(this,$2)"
                }
            ]
        }
    ],

    getDecoration(user: { id: string; }, original: unknown) {
        try {
            if (!isSelf(user?.id)) return original;
            const { decoration } = LarpStore.get();
            if (!decoration) return original;
            // stabile Objekt-Identität, sonst rendert Discord ständig neu
            const key = `${decoration.asset}:${decoration.skuId}`;
            if (decoCache?.key !== key) decoCache = { key, value: { asset: decoration.asset, skuId: decoration.skuId ?? "0" } };
            return decoCache.value;
        } catch {
            return original;
        }
    },

    getNameplate(user: { id: string; }, original: unknown) {
        try {
            if (!isSelf(user?.id)) return original;
            const { nameplate, nameplateData } = LarpStore.get();
            if (!nameplate || !nameplateData) return original;
            const key = `${nameplate}:${nameplateData.asset}:${nameplateData.palette}`;
            if (nameplateCache?.key !== key) {
                nameplateCache = { key, value: { skuId: nameplate, asset: nameplateData.asset, label: nameplateData.label ?? "", palette: nameplateData.palette ?? "" } };
            }
            return nameplateCache.value;
        } catch {
            return original;
        }
    },

    start() {
        registerHubTab({ id: "decorations", title: "Dekorationen", Component: DecorationsTab });
    },

    stop() {
        unregisterHubTab("decorations");
    }
});
