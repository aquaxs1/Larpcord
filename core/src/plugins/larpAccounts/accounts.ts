/*
 * Larpcord, a standalone Discord client for local cosmetic larping
 * Copyright (c) 2026 Larpcord contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { t } from "@plugins/larpCore/i18n";
import { LarpStore, logger } from "@plugins/larpCore/store";
import { LarpAccount } from "@plugins/larpCore/types";
import { getRealNames } from "@plugins/larpName/names";
import { UserStore } from "@webpack/common";

import { showSwitchScreen } from "./switchScreen";

/** How an account shows up in menus and the hub: like a real account (avatar, display name, username) */
export interface AccountView {
    id: string | undefined;
    displayName: string;
    username: string;
    avatarUrl: string | undefined;
    active: boolean;
}

function realAvatar(): string | undefined {
    try {
        return UserStore.getCurrentUser()?.getAvatarURL(undefined, 80, false);
    } catch {
        return undefined;
    }
}

/** account = undefined → the real profile */
export function accountView(account: LarpAccount | undefined, index = 0): AccountView {
    const real = getRealNames();
    const realUsername = real.username || "";
    const active = LarpStore.activeAccountId === account?.id;
    if (!account) {
        return { id: undefined, displayName: real.globalName || realUsername || t("accounts.real"), username: realUsername, avatarUrl: realAvatar(), active };
    }
    const { names, profile } = account.profile;
    const username = names.username || realUsername;
    return {
        id: account.id,
        displayName: names.displayName || names.username || real.globalName || t("accounts.unnamed", { number: index + 1 }),
        username,
        avatarUrl: profile.animatedAvatarUrl || realAvatar(),
        active
    };
}

export function allAccountViews(): AccountView[] {
    return LarpStore.getAccounts().map((a, i) => accountView(a, i));
}

let switching = false;

/**
 * Switches the larp account (undefined = real profile). Only the local larp profile changes:
 * no real account switch, no token, nothing is sent to Discord.
 */
export async function switchLarpAccount(id: string | undefined) {
    if (switching || LarpStore.activeAccountId === id) return;
    switching = true;
    try {
        if (LarpStore.switchAnimation) await showSwitchScreen(() => LarpStore.switchAccount(id));
        else LarpStore.switchAccount(id);
    } catch (e) {
        logger.error("Larp-Konto konnte nicht gewechselt werden", e);
        LarpStore.switchAccount(id);
    } finally {
        switching = false;
    }
}
