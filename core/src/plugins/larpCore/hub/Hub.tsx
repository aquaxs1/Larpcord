/*
 * Larpcord, a standalone Discord client for local cosmetic larping
 * Copyright (c) 2026 Larpcord contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import ErrorBoundary from "@components/ErrorBoundary";
import { t, useLarpLocale } from "@plugins/larpCore/i18n";
import { useLarpProfile } from "@plugins/larpCore/store";
import { useState } from "@webpack/common";

import { LARPCORD_LOGO } from "../logo";
import { cl, Placeholder } from "./components";
import { PresetsTab } from "./PresetsTab";
import { UpdatesTab } from "./UpdatesTab";
import { Preview } from "./Preview";
import { getHubTab, HUB_TABS, HubTabId, hubTabTitle } from "./registry";

let lastTab: HubTabId = "badges";

function TabContent({ id }: { id: HubTabId; }) {
    if (id === "presets") return <PresetsTab />;
    if (id === "updates") return <UpdatesTab />;
    const meta = HUB_TABS.find(entry => entry.id === id)!;
    const tab = getHubTab(id);
    if (!tab) return <Placeholder title={hubTabTitle(id)} plugin={meta.plugin} />;
    return <tab.Component />;
}

function LarpHub() {
    const [tab, setTab] = useState<HubTabId>(lastTab);
    useLarpProfile(); // Hub neu rendern, wenn sich etwas ändert
    useLarpLocale(); // … und wenn Discords Sprache wechselt

    return (
        <div className={cl("hub")}>
            <header className={cl("hub-header")}>
                <div>
                    <h2><img className={cl("hub-logo")} src={LARPCORD_LOGO} alt="" draggable={false} /> Larpcord</h2>
                    <p>{t("core.hub.subtitle")}</p>
                </div>
            </header>

            <nav className={cl("tabs")} role="tablist">
                {HUB_TABS.map(entry => (
                    <button
                        key={entry.id}
                        role="tab"
                        aria-selected={tab === entry.id}
                        className={cl("tab", tab === entry.id && "tab-active")}
                        onClick={() => setTab(lastTab = entry.id)}
                    >
                        {hubTabTitle(entry.id)}
                    </button>
                ))}
            </nav>

            <div className={cl("hub-body")}>
                <div className={cl("hub-content")}>
                    <ErrorBoundary message={t("core.hub.tabError")} key={tab}>
                        <TabContent id={tab} />
                    </ErrorBoundary>
                </div>
                <aside className={cl("hub-preview")}>
                    <h4>{t("common.preview")}</h4>
                    <Preview />
                    <small className={cl("muted")}>{t("core.hub.previewHint")}</small>
                </aside>
            </div>
        </div>
    );
}

/** Fehlermeldung erst beim Rendern übersetzen (ErrorBoundary.wrap würde sie beim Laden des Moduls einfrieren) */
export function Hub() {
    useLarpLocale();
    return (
        <ErrorBoundary message={t("core.hub.error")}>
            <LarpHub />
        </ErrorBoundary>
    );
}
