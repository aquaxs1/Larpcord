/*
 * Larpcord, a standalone Discord client for local cosmetic larping
 * Copyright (c) 2026 Larpcord contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { findGroupChildrenByChildId, NavContextMenuPatchCallback } from "@api/ContextMenu";
import { registerHubTab, unregisterHubTab } from "@plugins/larpCore/hub/registry";
import { onLocaleChange, t } from "@plugins/larpCore/i18n";
import { LarpStore, logger } from "@plugins/larpCore/store";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { Menu, showToast, Toasts } from "@webpack/common";

import { setEditing, toggleEditing } from "./EditMode";
import {
    buildLayoutCss, hasLayout, invalidateLabels, isDmPinned, migrateStoredLayout, orderDmIds, orderGuildRoots,
    PrivateChannelSortStore, resetLayout, setDmPinned, SortedGuildStore
} from "./layout";
import { LayoutTab } from "./LayoutTab";
import { clearShiftCallback, onShiftAtStartup } from "./safety";

/*
 * Eigenes Layout, nur lokal:
 * - Serverleiste und DMs werden beim Rendern umsortiert (Discords synchronisierte Reihenfolge
 *   bleibt unberührt, natives Drag & Drop funktioniert weiter).
 * - Buttons in User-Panel und Kanal-Header per CSS order/display, User-Panel oben/unten per CSS.
 * - Bearbeitungsmodus über den Hub oder Strg+Shift+L.
 * - Sprachwechsel: Die CSS-Selektoren nutzen Discords übersetzte aria-labels und werden deshalb
 *   nach jedem Wechsel neu erzeugt (mehrmals, weil Discord die Texte asynchron nachlädt).
 */

let layoutVersion = 0;
let styleEl: HTMLStyleElement | undefined;
let unsubscribe: (() => void) | undefined;
let unsubscribeLocale: (() => void) | undefined;
let lastLayout = "";
let refreshTimers: ReturnType<typeof setTimeout>[] = [];
let migrateTimer: ReturnType<typeof setTimeout> | undefined;

/** CSS neu erzeugen, nur schreiben, wenn es sich geändert hat */
function refreshCss() {
    if (!styleEl) return;
    const css = buildLayoutCss(LarpStore.get().layout);
    if (styleEl.textContent !== css) styleEl.textContent = css;
}

/** Alte, sprachabhängige Button-Schlüssel umstellen. Verzögert, weil applyLayout ein Store-Listener ist. */
function scheduleMigration() {
    clearTimeout(migrateTimer);
    migrateTimer = setTimeout(() => {
        try {
            migrateStoredLayout();
        } catch (e) {
            logger.error("Layout: Umstellung der Button-Schlüssel fehlgeschlagen", e);
        }
    }, 0);
}

function applyLayout() {
    const { layout } = LarpStore.get();
    const json = JSON.stringify(layout ?? null);
    if (json === lastLayout) return;
    lastLayout = json;
    layoutVersion++;

    refreshCss();
    if (layout) scheduleMigration();
    // Nur lokale Stores anstoßen, damit Serverleiste und DM-Liste neu sortiert rendern
    for (const store of [SortedGuildStore, PrivateChannelSortStore]) {
        try {
            store.emitChange();
        } catch (e) {
            logger.warn("Layout: emitChange fehlgeschlagen", e);
        }
    }
}

/** Discords Texte neu lesen und CSS neu erzeugen, sofort und nach kurzen Pausen */
function refreshLabelsSoon(delays: number[]) {
    for (const timer of refreshTimers) clearTimeout(timer);
    const run = () => {
        try {
            invalidateLabels();
            refreshCss();
            if (hasLayout()) scheduleMigration();
        } catch (e) {
            logger.error("Layout: Aktualisierung nach Sprachwechsel fehlgeschlagen", e);
        }
    };
    refreshTimers = delays.map(ms => setTimeout(run, ms));
}

const onLocale = () => refreshLabelsSoon([0, 500, 2000, 5000]);

function onKeyDown(e: KeyboardEvent) {
    if (e.ctrlKey && e.shiftKey && !e.altKey && e.code === "KeyL") {
        e.preventDefault();
        e.stopPropagation();
        toggleEditing();
    }
}

const DmContextMenu: NavContextMenuPatchCallback = (children, props) => {
    const channel = props?.channel;
    if (!channel?.id || !(channel.isDM?.() || channel.isGroupDM?.())) return;
    const pinned = isDmPinned(channel.id);
    const item = (
        <Menu.MenuItem
            id="larp-pin-dm"
            label={pinned ? t("layout.dmMenu.unpin") : t("layout.dmMenu.pin")}
            action={() => setDmPinned(channel.id, !pinned)}
        />
    );
    const group = findGroupChildrenByChildId("close-dm", children) ?? findGroupChildrenByChildId("leave-channel", children);
    if (group) group.unshift(item);
    else children.push(<Menu.MenuGroup>{item}</Menu.MenuGroup>);
};

export default definePlugin({
    name: "LarpLayout",
    get description() {
        return t("plugin.LarpLayout.description");
    },
    tags: ["Larpcord"],
    authors: [Devs.Larpcord],
    enabledByDefault: true,
    dependencies: ["LarpCore", "ContextMenuAPI"],

    contextMenus: {
        "user-context": DmContextMenu,
        "gdm-context": DmContextMenu
    },

    patches: [
        {
            // Serverleiste: oberste Ebene beim Rendern umsortieren. Die Layout-Version im Selektor
            // sorgt dafür, dass die Liste nach einer Änderung neu rendert.
            find: ".getGuildsTree();return[",
            replacement: {
                match: /(getGuildsTree\(\);return\[(\i),\2\.version)(\]\}\),\i=)(\i)\.getRoots\(\)/,
                replace: "$1,$self.getLayoutVersion()$3$self.orderGuildRoots($4.getRoots())"
            }
        },
        {
            // DM-Liste: angepinnte DMs oben
            find: '"dm-quick-launcher"===',
            replacement: {
                match: /(?<=let (\i)=\i\.\i\.getPrivateChannelIds\(\);return)(\(0,\i\.\i\)\(\1,\[[^\]]*\]\))/,
                // führendes Leerzeichen: im Original steht "return(0,…)" ohne Leerzeichen
                replace: " $self.orderDmIds($2)"
            }
        }
    ],

    orderGuildRoots,
    orderDmIds,
    getLayoutVersion: () => layoutVersion,

    /** Wird vom Tray-Menü der Desktop-App aufgerufen */
    async resetFromTray() {
        setEditing(false);
        await resetLayout("Tray");
        showToast(t("layout.toast.resetTray"), Toasts.Type.MESSAGE);
    },

    start() {
        registerHubTab({ id: "layout", title: "Layout", Component: LayoutTab });

        styleEl = document.createElement("style");
        styleEl.id = "larp-layout-css";
        document.head.appendChild(styleEl);
        lastLayout = "";
        applyLayout();
        unsubscribe = LarpStore.subscribe(applyLayout);
        unsubscribeLocale = onLocaleChange(onLocale);
        // Beim Start sind Discords Übersetzungen evtl. noch nicht geladen: später noch einmal lesen
        refreshLabelsSoon([2000, 6000]);

        window.addEventListener("keydown", onKeyDown, true);

        onShiftAtStartup(async () => {
            await LarpStore.init();
            if (!hasLayout()) return;
            setEditing(false);
            await resetLayout("Shift beim Start");
            showToast(t("layout.toast.resetShift"), Toasts.Type.MESSAGE);
        });
    },

    stop() {
        unregisterHubTab("layout");
        setEditing(false);
        unsubscribe?.();
        unsubscribeLocale?.();
        unsubscribeLocale = undefined;
        for (const timer of refreshTimers) clearTimeout(timer);
        refreshTimers = [];
        clearTimeout(migrateTimer);
        window.removeEventListener("keydown", onKeyDown, true);
        clearShiftCallback();
        styleEl?.remove();
        styleEl = undefined;
        lastLayout = "";
        layoutVersion++;
    }
});
