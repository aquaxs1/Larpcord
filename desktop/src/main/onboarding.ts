/*
 * Larpcord, a standalone Discord client for local cosmetic larping
 * Copyright (c) 2026 Larpcord contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

/*
 * Onboarding beim allerersten Start (ersetzt Vesktops „First Launch Tour“).
 * Ablauf: Setup-Splash → Onboarding-Fenster (4 Schritte) → Einstellungen übernehmen → createWindows().
 *
 * Die Larp-Daten (Start-Preset, Wasserzeichen) liegen im Core, nicht hier. Sie werden deshalb als
 * State.pendingOnboarding abgelegt; der Core holt sie beim ersten Start genau einmal ab
 * (VesktopNative.larpcord.consumeOnboarding(), siehe larpCore/index.tsx) und leert sie dabei.
 */

import { app, BrowserWindow } from "electron";
import { copyFileSync, existsSync, mkdirSync, readdirSync } from "fs";
import { join } from "path";
import { IpcEvents } from "shared/IpcEvents";
import type { LarpPendingOnboarding } from "shared/settings";

import { autoStart } from "./autoStart";
import { DATA_DIR } from "./constants";
import { t } from "./i18n";
import { createWindows } from "./mainWindow";
import { Settings, State } from "./settings";
import { createSetupSplashWindow } from "./splash";
import { handle, handleSync } from "./utils/ipcWrappers";
import { makeLinksOpenExternally } from "./utils/makeLinksOpenExternally";
import { loadView } from "./vesktopStatic";

const BUILTIN_PRESETS = ["staff", "nitro", "og2015"] as const;

/** Ergebnis des Onboarding-Fensters (siehe src/preload/onboarding.ts) */
interface OnboardingResult {
    preset?: unknown;
    watermark?: unknown;
    autoStart?: unknown;
    minimizeToTray?: unknown;
    importSettings?: unknown;
}

const VENCORD_SETTINGS_DIR = join(app.getPath("userData"), "..", "Vencord", "settings");

function hasVencordSettings() {
    try {
        return existsSync(VENCORD_SETTINGS_DIR);
    } catch {
        return false;
    }
}

/** Einstellungen einer vorhandenen Vencord-Installation übernehmen (wie in Vesktops First-Launch-Tour) */
function importVencordSettings() {
    const to = join(DATA_DIR, "settings");
    try {
        const files = readdirSync(VENCORD_SETTINGS_DIR);
        mkdirSync(to, { recursive: true });

        for (const file of files) {
            copyFileSync(join(VENCORD_SETTINGS_DIR, file), join(to, file));
        }
    } catch (e) {
        if (e instanceof Error && "code" in e && e.code === "ENOENT") {
            console.log("No Vencord settings found to import.");
        } else {
            console.error("Failed to import Vencord settings:", e);
        }
    }
}

let onboardingWin: BrowserWindow | undefined;

function applyResult(data: OnboardingResult) {
    const preset = BUILTIN_PRESETS.find(p => p === data.preset) ?? null;

    Settings.store.minimizeToTray = !!data.minimizeToTray;
    if (data.autoStart) {
        try {
            autoStart.enable();
        } catch (e) {
            console.error("Failed to enable autostart:", e);
        }
    }
    if (data.importSettings) importVencordSettings();

    // Preset und Wasserzeichen holt sich der Core beim nächsten Start ab
    State.store.pendingOnboarding = { preset, watermark: !!data.watermark };
    State.store.firstLaunch = false;
}

/** So lange bleibt der Setup-Splash mindestens stehen, sonst blitzt er nur kurz auf */
const MIN_SPLASH_MS = 1400;

/** Startet Setup-Splash und Onboarding-Fenster. Nur beim allerersten Start (State.firstLaunch fehlt). */
export function startOnboarding() {
    const splash = createSetupSplashWindow();
    const splashShownAt = Date.now();

    const { splashTheming, splashBackground } = Settings.store;

    onboardingWin = new BrowserWindow({
        show: false,
        width: 720,
        height: 640,
        center: true,
        resizable: false,
        maximizable: false,
        fullscreenable: false,
        autoHideMenuBar: true,
        title: t("desktop.onboarding.title"),
        backgroundColor: (splashTheming && splashBackground) || "#1e1f22",
        webPreferences: {
            preload: join(__dirname, "onboardingPreload.js"),
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: true
        }
    });

    makeLinksOpenExternally(onboardingWin);
    loadView(onboardingWin, "onboarding.html");

    // Theme-Farben der letzten Sitzung übernehmen (beim allerersten Start gibt es noch keine → Discord-Look)
    if (splashTheming) {
        const { splashColor } = Settings.store;
        if (splashColor) onboardingWin.webContents.insertCSS(`:root { --fg: ${splashColor} !important }`);
        if (splashBackground) onboardingWin.webContents.insertCSS(`:root { --bg: ${splashBackground} !important }`);
    }

    onboardingWin.once("ready-to-show", () => {
        // Die Views laden in wenigen hundert Millisekunden, der Splash soll trotzdem kurz zu sehen sein
        setTimeout(
            () => {
                if (!splash.isDestroyed()) splash.destroy();
                if (onboardingWin && !onboardingWin.isDestroyed()) onboardingWin.show();
            },
            Math.max(0, MIN_SPLASH_MS - (Date.now() - splashShownAt))
        );
    });

    // Fenster geschlossen, ohne fertig zu werden (X) → wie „Beenden“
    onboardingWin.on("closed", () => {
        const finished = State.store.firstLaunch === false;
        onboardingWin = undefined;
        if (!splash.isDestroyed()) splash.destroy();
        if (!finished) app.exit();
    });
}

handleSync(IpcEvents.LARP_ONBOARDING_GET_INFO, () => ({
    hasVencordSettings: hasVencordSettings(),
    reducedMotion: !!Settings.store.splashReducedMotion
}));

handle(IpcEvents.LARP_ONBOARDING_FINISH, (_, data: OnboardingResult) => {
    try {
        applyResult(data ?? {});
    } catch (e) {
        console.error("Failed to apply onboarding settings:", e);
        State.store.firstLaunch = false;
    }

    onboardingWin?.close();
    createWindows();
});

handle(IpcEvents.LARP_ONBOARDING_QUIT, () => app.exit());

/** Der Core holt das Ergebnis genau einmal ab, danach ist es weg. */
handle(IpcEvents.LARP_ONBOARDING_CONSUME, (): LarpPendingOnboarding | null => {
    const pending = State.store.pendingOnboarding;
    if (!pending) return null;
    State.store.pendingOnboarding = undefined;
    // Als einfaches Objekt zurückgeben (State.store liefert Proxies)
    return { preset: pending.preset ?? null, watermark: !!pending.watermark };
});
