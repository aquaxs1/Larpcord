/*
 * Vesktop, a desktop app aiming to give you a snappier Discord Experience
 * Copyright (c) 2025 Vendicated and Vesktop contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { app, BrowserWindow, Menu, Tray } from "electron";

import { createAboutWindow } from "./about";
import { AppEvents } from "./events";
import { onMainLocaleChange, t } from "./i18n";
import { Settings } from "./settings";
import { resolveAssetPath } from "./userAssets";
import { clearData } from "./utils/clearData";

let tray: Tray;
let trayVariant: "tray" | "trayUnread" = "tray";

AppEvents.on("userAssetChanged", async asset => {
    if (tray && (asset === "tray" || asset === "trayUnread")) {
        tray.setImage(await resolveAssetPath(trayVariant));
    }
});

AppEvents.on("setTrayVariant", async variant => {
    if (trayVariant === variant) return;

    trayVariant = variant;
    if (!tray) return;

    tray.setImage(await resolveAssetPath(trayVariant));
});

export function destroyTray() {
    unsubscribeLocale?.();
    unsubscribeLocale = undefined;
    tray?.destroy();
}

/** Tray-Menü in der aktuellen Sprache (wird bei Sprachwechsel neu gebaut) */
function buildTrayMenu(win: BrowserWindow, setIsQuitting: (val: boolean) => void) {
    return Menu.buildFromTemplate([
        {
            label: t("desktop.menu.open"),
            click() {
                win.show();
            }
        },
        {
            label: t("desktop.menu.about"),
            click: createAboutWindow
        },
        {
            // Sicherheitsnetz für larpLayout: setzt nur das lokale Layout zurück
            label: t("desktop.menu.resetLayout"),
            click() {
                win.show();
                win.webContents
                    .executeJavaScript("globalThis.Vencord?.Plugins?.plugins?.LarpLayout?.resetFromTray?.()")
                    .catch(() => {});
            }
        },
        {
            label: t("desktop.menu.resetLarpcord"),
            async click() {
                await clearData(win);
            }
        },
        {
            type: "separator"
        },
        {
            label: t("desktop.menu.restart"),
            click() {
                app.relaunch();
                app.quit();
            }
        },
        {
            label: t("desktop.menu.quit"),
            click() {
                setIsQuitting(true);
                app.quit();
            }
        }
    ]);
}

let unsubscribeLocale: (() => void) | undefined;

export async function initTray(win: BrowserWindow, setIsQuitting: (val: boolean) => void) {
    const onTrayClick = () => {
        if (Settings.store.clickTrayToShowHide && win.isVisible()) win.hide();
        else win.show();
    };

    tray = new Tray(await resolveAssetPath(trayVariant));
    // Markenname, nicht übersetzt
    tray.setToolTip("Larpcord");
    tray.setContextMenu(buildTrayMenu(win, setIsQuitting));
    tray.on("click", onTrayClick);

    // Larpcord: Menü bei Sprachwechsel (Discord-Sprache) neu aufbauen
    unsubscribeLocale?.();
    unsubscribeLocale = onMainLocaleChange(() => {
        if (!tray || tray.isDestroyed() || win.isDestroyed()) return;
        tray.setContextMenu(buildTrayMenu(win, setIsQuitting));
    });
}
