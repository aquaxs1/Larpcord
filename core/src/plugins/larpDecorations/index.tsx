/*
 * Larpcord, a standalone Discord client for local cosmetic larping
 * Copyright (c) 2026 Larpcord contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { registerHubTab, unregisterHubTab } from "@plugins/larpCore/hub/registry";
import { t } from "@plugins/larpCore/i18n";
import { larpProfileFor } from "@plugins/larpCore/store";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

import { DecorationsTab } from "./DecorationsTab";

/*
 * Avatar-Dekoration und Nameplate liest Discord über Getter am User-Modell (user.avatarDecoration,
 * user.nameplate). Wir biegen nur diese beiden Getter für den eigenen User um, das User-Objekt
 * selbst und der Server bleiben unberührt. Profileffekte laufen über den Profil-Hook in larpCore.
 */

// Stable object identity per value (otherwise Discord re-renders all the time); shared larp profiles add more entries
const decoCache = new Map<string, any>();
const nameplateCache = new Map<string, any>();

function cached(cache: Map<string, any>, key: string, make: () => any) {
    let value = cache.get(key);
    if (value === undefined) {
        if (cache.size > 500) cache.clear();
        cache.set(key, value = make());
    }
    return value;
}

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
            const decoration = larpProfileFor(user?.id)?.decoration;
            if (!decoration) return original;
            // stabile Objekt-Identität, sonst rendert Discord ständig neu
            const key = `${decoration.asset}:${decoration.skuId}`;
            return cached(decoCache, key, () => ({ asset: decoration.asset, skuId: decoration.skuId ?? "0" }));
        } catch {
            return original;
        }
    },

    getNameplate(user: { id: string; }, original: unknown) {
        try {
            const larp = larpProfileFor(user?.id);
            const nameplate = larp?.nameplate, nameplateData = larp?.nameplateData;
            if (!nameplate || !nameplateData) return original;
            const key = `${nameplate}:${nameplateData.asset}:${nameplateData.palette}`;
            return cached(nameplateCache, key, () => ({ skuId: nameplate, asset: nameplateData.asset, label: nameplateData.label ?? "", palette: nameplateData.palette ?? "" }));
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
