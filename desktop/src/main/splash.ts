/*
 * Vesktop, a desktop app aiming to give you a snappier Discord Experience
 * Copyright (c) 2023 Vendicated and Vencord contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { BrowserWindow } from "electron";
import { join } from "path";
import { SplashProps } from "shared/browserWinProperties";

import { Settings } from "./settings";
import { loadView } from "./vesktopStatic";

let splash: BrowserWindow | undefined;

export function createSplashWindow(startMinimized = false) {
    splash = new BrowserWindow({
        ...SplashProps,
        show: !startMinimized,
        webPreferences: {
            preload: join(__dirname, "splashPreload.js")
        }
    });

    loadView(splash, "splash.html");

    // Larpcord: eigener Ladetext (als textContent, also kein HTML). Ohne eigenen Text zeigt splash.html
    // den übersetzten Standardtext (data-i18n="desktop.splash.loading"). Beim eigenen Text wird data-i18n
    // entfernt, damit ein Sprachwechsel ihn nicht überschreibt.
    const { splashText } = Settings.store;
    if (splashText) {
        splash.webContents.once("dom-ready", () => {
            splash?.webContents
                .executeJavaScript(
                    `(() => { const el = document.getElementById("splash-text"); el.removeAttribute("data-i18n"); el.textContent = ${JSON.stringify(splashText.slice(0, 100))}; })()`
                )
                .catch(() => {});
        });
    }

    const { splashBackground, splashColor, splashTheming, splashPixelated } = Settings.store;

    if (splashTheming) {
        if (splashColor) {
            const semiTransparentSplashColor = splashColor.replace("rgb(", "rgba(").replace(")", ", 0.2)");

            splash.webContents.insertCSS(`body { --fg: ${splashColor} !important }`);
            splash.webContents.insertCSS(`body { --fg-semi-trans: ${semiTransparentSplashColor} !important }`);
        }

        if (splashBackground) {
            splash.webContents.insertCSS(`body { --bg: ${splashBackground} !important }`);
        }
    }

    if (splashPixelated) {
        splash.webContents.insertCSS(`img { image-rendering: pixelated; }`);
    }

    return splash;
}

export function updateSplashMessage(message: string) {
    if (splash && !splash.isDestroyed()) splash.webContents.send("update-splash-message", message);
}
