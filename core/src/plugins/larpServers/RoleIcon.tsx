/*
 * Larpcord, a standalone Discord client for local cosmetic larping
 * Copyright (c) 2026 Larpcord contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import ErrorBoundary from "@components/ErrorBoundary";
import { useLarpProfile } from "@plugins/larpCore/store";
import { LarpRole } from "@plugins/larpCore/types";

import { topIconRole } from "./roles";

/** Icon der höchsten zugewiesenen Larp-Rolle, neben dem Namen in Chat und Mitgliederliste */
function Icon({ guildId }: { guildId: string | undefined; }) {
    useLarpProfile();
    const role: LarpRole | undefined = topIconRole(guildId);
    if (!role?.iconUrl) return null;
    return <img className="larp-role-icon" src={role.iconUrl} alt="" title={role.name} draggable={false} />;
}

export const RoleIcon = ErrorBoundary.wrap(Icon, { noop: true });
