/*
 * Larpcord, a standalone Discord client for local cosmetic larping
 * Copyright (c) 2026 Larpcord contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { NavContextMenuPatchCallback } from "@api/ContextMenu";
import { registerHubTab, unregisterHubTab } from "@plugins/larpCore/hub/registry";
import { t } from "@plugins/larpCore/i18n";
import { RemoteProfiles } from "@plugins/larpCore/store";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { Menu } from "@webpack/common";

import { onConnectionOpen, setShowReal, startSync, stopSync } from "./sync";
import { SyncTab } from "./SyncTab";

/*
 * Larp sync: see the larp profiles of other Larpcord users, and share your own.
 *
 * Runs over the Larpcord sync server (server/), never over Discord: no write requests, no presence updates.
 * Shared profiles of others only reach the same display copies the own larp profile uses
 * (larpCore/store.ts → larpProfileFor). Their profile menu has "Show real profile" / "Show Larpcord profile".
 */

const ProfileMenu: NavContextMenuPatchCallback = (children, props) => {
    const userId: string | undefined = props?.user?.id;
    if (!userId || !(RemoteProfiles.inIndex(userId) || RemoteProfiles.get(userId))) return;
    const showingReal = RemoteProfiles.isShowingReal(userId);
    children.push(
        <Menu.MenuGroup>
            <Menu.MenuItem
                id="larp-sync-toggle-profile"
                label={showingReal ? t("sync.menu.showLarp") : t("sync.menu.showReal")}
                action={() => void setShowReal(userId, !showingReal)}
            />
        </Menu.MenuGroup>
    );
};

export default definePlugin({
    name: "LarpSync",
    get description() {
        return t("plugin.LarpSync.description");
    },
    tags: ["Larpcord"],
    authors: [Devs.Larpcord],
    enabledByDefault: true,
    dependencies: ["LarpCore", "ContextMenuAPI"],

    contextMenus: {
        "user-profile-overflow-menu": ProfileMenu,
        "user-profile-actions": ProfileMenu,
        "user-context": ProfileMenu
    },

    flux: {
        CONNECTION_OPEN: onConnectionOpen
    },

    start() {
        registerHubTab({ id: "sync", Component: SyncTab });
        void startSync();
    },

    stop() {
        unregisterHubTab("sync");
        stopSync();
    }
});
