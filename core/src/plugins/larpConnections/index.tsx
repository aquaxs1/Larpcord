/*
 * Larpcord, a standalone Discord client for local cosmetic larping
 * Copyright (c) 2026 Larpcord contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { registerHubTab, unregisterHubTab } from "@plugins/larpCore/hub/registry";
import { t } from "@plugins/larpCore/i18n";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

import { ConnectionsTab } from "./ConnectionsTab";

/*
 * Made-up connected accounts (Steam, Spotify, GitHub …) on the own profile.
 *
 * Display only: they are added to the display copy of the own profile in
 * larpCore/profileOverride.ts (UserProfileStore.getUserProfile → connectedAccounts).
 * ConnectedAccountsStore, which backs Settings → Connections and can send requests, is never
 * touched, and nothing is linked to a real account (rule 1).
 */
export default definePlugin({
    name: "LarpConnections",
    get description() {
        return t("plugin.LarpConnections.description");
    },
    tags: ["Larpcord"],
    authors: [Devs.Larpcord],
    enabledByDefault: true,
    dependencies: ["LarpCore"],

    start() {
        registerHubTab({ id: "connections", title: "Connections", Component: ConnectionsTab });
    },

    stop() {
        unregisterHubTab("connections");
    }
});
