/*
 * Larpcord, a standalone Discord client for local cosmetic larping
 * Copyright (c) 2026 Larpcord contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { AccountView } from "./accounts";

/** Avatar, display name and username – the way Discord lists its real accounts */
export function AccountRow({ view, small }: { view: AccountView; small?: boolean; }) {
    return (
        <span className={small ? "larp-account-row larp-account-row-small" : "larp-account-row"}>
            {view.avatarUrl
                ? <img src={view.avatarUrl} alt="" draggable={false} />
                : <span className="larp-account-avatar-empty" />}
            <span className="larp-account-names">
                <strong>{view.displayName}</strong>
                {view.username && <small>{view.username}</small>}
            </span>
        </span>
    );
}
