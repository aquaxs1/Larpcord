/*
 * Larpcord, a standalone Discord client for local cosmetic larping
 * Copyright (c) 2026 Larpcord contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import ErrorBoundary from "@components/ErrorBoundary";
import { useLarpProfile } from "@plugins/larpCore/store";
import { useState } from "@webpack/common";

import { cl, Placeholder } from "./components";
import { PresetsTab } from "./PresetsTab";
import { Preview } from "./Preview";
import { getHubTab, HUB_TABS, HubTabId } from "./registry";

let lastTab: HubTabId = "badges";

function TabContent({ id }: { id: HubTabId; }) {
    if (id === "presets") return <PresetsTab />;
    const meta = HUB_TABS.find(t => t.id === id)!;
    const tab = getHubTab(id);
    if (!tab) return <Placeholder title={meta.title} plugin={meta.plugin} />;
    return <tab.Component />;
}

function LarpHub() {
    const [tab, setTab] = useState<HubTabId>(lastTab);
    useLarpProfile(); // Hub neu rendern, wenn sich etwas ändert

    return (
        <div className={cl("hub")}>
            <header className={cl("hub-header")}>
                <div>
                    <h2>🎭 Larpcord</h2>
                    <p>Alles hier ist nur auf deinem PC sichtbar. Dein Account wird nicht verändert.</p>
                </div>
            </header>

            <nav className={cl("tabs")} role="tablist">
                {HUB_TABS.map(t => (
                    <button
                        key={t.id}
                        role="tab"
                        aria-selected={tab === t.id}
                        className={cl("tab", tab === t.id && "tab-active")}
                        onClick={() => setTab(lastTab = t.id)}
                    >
                        {t.title}
                    </button>
                ))}
            </nav>

            <div className={cl("hub-body")}>
                <div className={cl("hub-content")}>
                    <ErrorBoundary message="Dieser Bereich konnte nicht geladen werden." key={tab}>
                        <TabContent id={tab} />
                    </ErrorBoundary>
                </div>
                <aside className={cl("hub-preview")}>
                    <h4>Vorschau</h4>
                    <Preview />
                    <small className={cl("muted")}>So sieht dein Profil für dich aus. Andere sehen dein echtes Profil.</small>
                </aside>
            </div>
        </div>
    );
}

export const Hub = ErrorBoundary.wrap(LarpHub, { message: "Der Larpcord-Hub konnte nicht geladen werden." });
