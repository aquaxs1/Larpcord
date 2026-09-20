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

/** Larpcord: Query-Parameter, die jede Splash-Variante bekommt (Bewegung reduzieren, Einrichtungs-Text) */
function splashParams(setup: boolean) {
    const params = new URLSearchParams();
    if (Settings.store.splashReducedMotion) params.set("reducedMotion", "1");
    if (setup) params.set("setup", "1");
    return params;
}

/** Larpcord: Theme-Farben der letzten Sitzung auf ein Splash-Fenster anwenden */
function applySplashTheming(win: BrowserWindow) {
    const { splashBackground, splashColor, splashTheming, splashPixelated } = Settings.store;

    if (splashTheming) {
        if (splashColor) {
            const semiTransparentSplashColor = splashColor.replace("rgb(", "rgba(").replace(")", ", 0.2)");

            win.webContents.insertCSS(`body { --fg: ${splashColor} !important }`);
            win.webContents.insertCSS(`body { --fg-semi-trans: ${semiTransparentSplashColor} !important }`);
        }

        if (splashBackground) {
            win.webContents.insertCSS(`body { --bg: ${splashBackground} !important }`);
        }
    }

    if (splashPixelated) {
        win.webContents.insertCSS(`img { image-rendering: pixelated; }`);
    }
}

export function createSplashWindow(startMinimized = false) {
    splash = new BrowserWindow({
        ...SplashProps,
        show: !startMinimized,
        webPreferences: {
            preload: join(__dirname, "splashPreload.js")
        }
    });

    loadView(splash, "splash.html", splashParams(false));

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

    applySplashTheming(splash);

    return splash;
}

/**
 * Larpcord: Splash für den allerersten Start („Larpcord wird eingerichtet …“).
 * Läuft unabhängig vom normalen Lade-Splash und wird vom Onboarding wieder geschlossen.
 */
export function createSetupSplashWindow() {
    const win = new BrowserWindow({
        ...SplashProps,
        webPreferences: {
            preload: join(__dirname, "splashPreload.js")
        }
    });

    loadView(win, "splash.html", splashParams(true));
    applySplashTheming(win);

    return win;
}

export function updateSplashMessage(message: string) {
    if (splash && !splash.isDestroyed()) splash.webContents.send("update-splash-message", message);
}
