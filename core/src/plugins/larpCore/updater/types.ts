/*
 * Larpcord, a standalone Discord client for local cosmetic larping
 * Copyright (c) 2026 Larpcord contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

/*
 * Gemeinsamer Vertrag zwischen Core und Desktop-Teil für den Auto-Updater.
 * Liegt im Core, weil der Core keine Dateien außerhalb von core/ importieren darf (tsconfig rootDir).
 * Umsetzung: desktop/src/main/updater.ts, Anzeige: larpCore/updater/*.
 */

export type LarpUpdateChannel = "stable" | "beta";

export type LarpUpdaterState =
    /** Entwicklungs- oder portabler Build: Updates nur über neuen Installer */
    | "unsupported"
    | "idle"
    | "checking"
    | "not-available"
    | "downloading"
    | "downloaded"
    | "error";

export interface LarpUpdateInfo {
    version: string;
    releaseName?: string | null;
    releaseDate?: string;
    /** HTML (GitHub-Release-Text) oder Text. Im Renderer nur bereinigt anzeigen. */
    releaseNotes?: string | null;
}

export interface LarpUpdaterStatus {
    state: LarpUpdaterState;
    currentVersion: string;
    channel: LarpUpdateChannel;
    autoUpdate: boolean;
    lastCheck?: number;
    update?: LarpUpdateInfo;
    /** Download-Fortschritt 0–100 */
    progress?: number;
    /** Letzter Fehler (nur zur Anzeige im Hub, wird nie als Popup gezeigt) */
    error?: string;
    /** Version, deren Hinweis in dieser Sitzung mit „Später“ geschlossen wurde */
    dismissedVersion?: string;
}

export interface LarpUpdaterOptions {
    autoUpdate?: boolean;
    channel?: LarpUpdateChannel;
}
