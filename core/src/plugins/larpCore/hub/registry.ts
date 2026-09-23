/*
 * Larpcord, a standalone Discord client for local cosmetic larping
 * Copyright (c) 2026 Larpcord contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { ComponentType } from "react";

import { t } from "@plugins/larpCore/i18n";

/*
 * Die Larp-Plugins hängen ihre Unter-Tabs selbst in den Hub ein (registerHubTab in start(),
 * unregisterHubTab in stop()). Ist ein Plugin deaktiviert, zeigt der Hub einen Hinweis.
 */

export interface HubTab {
    id: HubTabId;
    /**
     * Wird nicht angezeigt (die Tab-Leiste nutzt HUB_TABS[].titleKey), bleibt aber für
     * Kompatibilität mit bestehenden registerHubTab-Aufrufen erlaubt.
     */
    title?: string;
    /** Optional, ebenfalls nicht angezeigt. Maßgeblich ist HUB_TABS[].titleKey */
    titleKey?: string;
    Component: ComponentType;
}

/** Titel werden als Schlüssel gespeichert und erst beim Rendern übersetzt (hubTabTitle) */
export const HUB_TABS = [
    { id: "badges", titleKey: "core.hub.tab.badges", plugin: "LarpBadges" },
    { id: "nitro", titleKey: "core.hub.tab.nitro", plugin: "LarpNitro" },
    { id: "decorations", titleKey: "core.hub.tab.decorations", plugin: "LarpDecorations" },
    { id: "name", titleKey: "core.hub.tab.name", plugin: "LarpName" },
    { id: "activity", titleKey: "core.hub.tab.activity", plugin: "LarpActivity" },
    { id: "servers", titleKey: "core.hub.tab.servers", plugin: "LarpServers" },
    { id: "themes", titleKey: "core.hub.tab.themes", plugin: "LarpThemes" },
    { id: "layout", titleKey: "core.hub.tab.layout", plugin: "LarpLayout" },
    { id: "presets", titleKey: "core.hub.tab.presets", plugin: "LarpCore" },
    { id: "updates", titleKey: "core.updates.tab", plugin: "LarpCore" },
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

/** Titel eines Hub-Tabs in der aktuellen Sprache */
export function hubTabTitle(id: HubTabId) {
    const meta = HUB_TABS.find(tab => tab.id === id);
    return meta ? t(meta.titleKey) : id;
}
