/*
 * Larpcord, a standalone Discord client for local cosmetic larping
 * Copyright (c) 2026 Larpcord contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { ComponentType } from "react";

/*
 * Die Larp-Plugins hängen ihre Unter-Tabs selbst in den Hub ein (registerHubTab in start(),
 * unregisterHubTab in stop()). Ist ein Plugin deaktiviert, zeigt der Hub einen Hinweis.
 */

export interface HubTab {
    id: HubTabId;
    title: string;
    Component: ComponentType;
}

export const HUB_TABS = [
    { id: "badges", title: "Badges", plugin: "LarpBadges" },
    { id: "nitro", title: "Nitro", plugin: "LarpNitro" },
    { id: "decorations", title: "Dekorationen", plugin: "LarpDecorations" },
    { id: "name", title: "Name", plugin: "LarpName" },
    { id: "servers", title: "Server", plugin: "LarpServers" },
    { id: "themes", title: "Themes", plugin: "LarpThemes" },
    { id: "presets", title: "Presets", plugin: "LarpCore" },
] as const;

export type HubTabId = typeof HUB_TABS[number]["id"];

const registered = new Map<HubTabId, HubTab>();

export function registerHubTab(tab: HubTab) {
    registered.set(tab.id, tab);
}

export function unregisterHubTab(id: HubTabId) {
    registered.delete(id);
}

export function getHubTab(id: HubTabId) {
    return registered.get(id);
}
