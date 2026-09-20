/*
 * Larpcord, a standalone Discord client for local cosmetic larping
 * Copyright (c) 2026 Larpcord contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// Preload des Onboarding-Fensters (desktop/src/main/onboarding.ts, static/views/onboarding.html).
// Nur das Nötigste: Übersetzungen, Startwerte und die beiden Aktionen „Los geht's“ und „Beenden“.

import { contextBridge, ipcRenderer } from "electron/renderer";

import { IpcEvents } from "../shared/IpcEvents";
import { exposeViewI18n } from "./viewI18n";

export interface OnboardingInfo {
    /** Gibt es eine Vencord-Installation, aus der Einstellungen übernommen werden können? */
    hasVencordSettings: boolean;
    /** Discords „Reduzierte Bewegung“ aus der letzten Sitzung (dann keine Animation) */
    reducedMotion: boolean;
}

export interface OnboardingResult {
    preset: "staff" | "nitro" | "og2015" | null;
    watermark: boolean;
    autoStart: boolean;
    minimizeToTray: boolean;
    importSettings: boolean;
}

exposeViewI18n();

contextBridge.exposeInMainWorld("LarpcordOnboarding", {
    getInfo: (): OnboardingInfo => ipcRenderer.sendSync(IpcEvents.LARP_ONBOARDING_GET_INFO),
    finish: (result: OnboardingResult) => ipcRenderer.invoke(IpcEvents.LARP_ONBOARDING_FINISH, result),
    quit: () => ipcRenderer.invoke(IpcEvents.LARP_ONBOARDING_QUIT)
});
