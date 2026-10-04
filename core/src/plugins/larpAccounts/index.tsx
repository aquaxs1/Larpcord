/*
 * Larpcord, a standalone Discord client for local cosmetic larping
 * Copyright (c) 2026 Larpcord contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { addGlobalContextMenuPatch, findGroupChildrenByChildId, GlobalContextMenuPatchCallback, removeGlobalContextMenuPatch } from "@api/ContextMenu";
import { registerHubTab, unregisterHubTab } from "@plugins/larpCore/hub/registry";
import { t } from "@plugins/larpCore/i18n";
import { getSelfId, LarpStore, logger } from "@plugins/larpCore/store";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { Menu, React } from "@webpack/common";
import type { ReactElement } from "react";

import { AccountRow } from "./AccountRow";
import { allAccountViews, switchLarpAccount } from "./accounts";
import { AccountsTab } from "./AccountsTab";

/*
 * Larp accounts: complete, separate larp profiles you switch between like real accounts.
 *
 * They show up in Discord's own account switcher, right below the real accounts and looking just
 * like them. Picking one only swaps the local larp profile (optionally behind a Discord-style
 * loading screen). The real account switch, MultiAccountStore and tokens are never touched, and
 * larp accounts are never added to Discord's account list (rule 1).
 *
 * The switcher is found via a global context menu patch: the group that contains Discord's own
 * account entries. If Discord renames those IDs, nothing happens and switching keeps working from
 * the hub (rule 6).
 */

/** Substrings of the IDs Discord uses for entries in its account switcher */
const SWITCHER_IDS = ["switch-account", "switch_account", "manage-accounts", "manage_accounts", "add-account", "add_account"];

let warnedNoSwitcher = false;

const patchSwitcher: GlobalContextMenuPatchCallback = (navId, children) => {
    try {
        const group = findGroupChildrenByChildId(SWITCHER_IDS, children, true);
        if (!group) return;
        if (group.some(c => (c as ReactElement<any> | null)?.props?.id?.startsWith?.("larp-account-"))) return;

        // The own real account: while a larp account is active, picking it goes back to the real profile
        const selfId = getSelfId();
        if (selfId && !LarpStore.isRealProfile) {
            const i = group.findIndex(c => typeof (c as ReactElement<any> | null)?.props?.id === "string" && (c as ReactElement<any>).props.id.includes(selfId));
            if (i >= 0) group[i] = React.cloneElement(group[i] as ReactElement<any>, { action: () => switchLarpAccount(undefined) });
        }

        const items = allAccountViews().map(v => (
            <Menu.MenuItem
                key={`larp-account-${v.id}`}
                id={`larp-account-${v.id}`}
                label={<AccountRow view={v} small />}
                action={() => switchLarpAccount(v.id)}
                disabled={v.active}
            />
        ));

        // Directly after the real accounts, before "Manage accounts" / "Add an account"
        const actionIndex = group.findIndex(c => /manage|add/i.test(String((c as ReactElement<any> | null)?.props?.id ?? "")));
        group.splice(actionIndex >= 0 ? actionIndex : group.length, 0, ...items);
    } catch (e) {
        if (!warnedNoSwitcher) logger.warn(`Konto-Wechsler (${navId}) konnte nicht erweitert werden`, e);
        warnedNoSwitcher = true;
    }
};

export default definePlugin({
    name: "LarpAccounts",
    get description() {
        return t("plugin.LarpAccounts.description");
    },
    tags: ["Larpcord"],
    authors: [Devs.Larpcord],
    enabledByDefault: true,
    dependencies: ["LarpCore", "ContextMenuAPI"],

    start() {
        registerHubTab({ id: "accounts", title: "Accounts", Component: AccountsTab });
        addGlobalContextMenuPatch(patchSwitcher);
    },

    stop() {
        unregisterHubTab("accounts");
        removeGlobalContextMenuPatch(patchSwitcher);
    }
});
