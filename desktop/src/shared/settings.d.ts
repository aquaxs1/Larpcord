/*
 * Vesktop, a desktop app aiming to give you a snappier Discord Experience
 * Copyright (c) 2023 Vendicated and Vencord contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { Rectangle } from "electron";

export interface Settings {
    discordBranch: "stable" | "canary" | "ptb";
    transparencyOption: "none" | "mica" | "tabbed" | "acrylic";
    webRTCIPHandlingPolicy:
        | "default"
        | "default_public_interface_only"
        | "default_public_and_private_interfaces"
        | "disable_non_proxied_udp";
    tray: boolean;
    minimizeToTray: boolean;
    autoStartMinimized: boolean;
    openLinksWithElectron: boolean;
    staticTitle: boolean;
    enableMenu: boolean;
    enableShadow: boolean;
    enableRoundedCorners: boolean;
    disableSmoothScroll: boolean;
    hardwareAcceleration: boolean;
    hardwareVideoAcceleration: boolean;
    arRPC: boolean;
    appBadge: boolean;
    enableTaskbarFlashing: boolean;
    disableMinSize: boolean;
    clickTrayToShowHide: boolean;
    nativeTitleBar: boolean;

    enableSplashScreen: boolean;
    splashTheming: boolean;
    splashPixelated: boolean;
    splashColor?: string;
    splashBackground?: string;
    /** Larpcord: eigener Text im Ladebildschirm */
    splashText?: string;
    /** Larpcord: Discords „Reduzierte Bewegung“ aus der letzten Sitzung (Splash/Onboarding animieren dann nicht) */
    splashReducedMotion?: boolean;
    /** Larpcord: zuletzt vom Core gemeldete Discord-Sprache (für Splash, Tray und Dialoge vor dem Login) */
    larpLocale?: string;
    /** Larpcord: Auto-Updater (electron-updater, GitHub-Releases von aquaxs1/Larpcord) */
    larpUpdater?: {
        /** Automatisch beim Start und alle 4 Stunden prüfen und im Hintergrund laden (Standard: an) */
        autoUpdate?: boolean;
        /** "beta" = auch GitHub-Prereleases (Standard: "stable") */
        channel?: "stable" | "beta";
    };

    spellCheckLanguages?: string[];

    audio?: {
        workaround?: boolean;

        deviceSelect?: boolean;
        granularSelect?: boolean;

        ignoreVirtual?: boolean;
        ignoreDevices?: boolean;
        ignoreInputMedia?: boolean;

        mute?: boolean;
        onlySpeakers?: boolean;
        onlyDefaultSpeakers?: boolean;
    };
}

/**
 * Larpcord: Was beim Onboarding gewählt wurde und noch im Core (Vencord-DataStore) ankommen muss.
 * Der Core holt es genau einmal ab (VesktopNative.larpcord.consumeOnboarding()) und leert es dabei.
 */
export interface LarpPendingOnboarding {
    /** ID eines mitgelieferten Presets, das beim Start geladen wird (null/undefined = keins) */
    preset?: "staff" | "nitro" | "og2015" | null;
    /** Wasserzeichen „🎭 Larpcord“ im eigenen Profil */
    watermark?: boolean;
}

export interface State {
    maximized?: boolean;
    minimized?: boolean;
    windowBounds?: Rectangle;

    firstLaunch?: boolean;

    steamOSLayoutVersion?: number;
    linuxAutoStartEnabled?: boolean;

    vencordDir?: string;

    updater?: {
        ignoredVersion?: string;
        snoozeUntil?: number;
    };

    /** Larpcord: Ergebnis des Onboardings, bis der Core es abgeholt hat */
    pendingOnboarding?: LarpPendingOnboarding;
}
