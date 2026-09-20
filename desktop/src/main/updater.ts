/*
 * Vesktop, a desktop app aiming to give you a snappier Discord Experience
 * Copyright (c) 2025 Vendicated and Vesktop contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

/*
 * Larpcord-Auto-Updater (electron-updater, GitHub-Releases von aquaxs1/Larpcord, siehe build.publish in package.json).
 * - Der Core wird mit der App ausgeliefert, ein App-Update aktualisiert also alles auf einmal.
 * - Prüft beim Start und alle 4 Stunden (abschaltbar), lädt im Hintergrund und meldet den Status an den Core,
 *   der den Hinweis im Discord-Stil zeigt („Jetzt neu starten“ / „Später“).
 * - „Später“: Das geladene Update wird beim nächsten Beenden installiert (autoInstallOnAppQuit).
 * - Kanal „Beta“ = GitHub-Prereleases (allowPrerelease), „Stabil“ = nur normale Releases.
 * - Fehler (kein Internet, Rate-Limit, kaputter Download) werden nur geloggt und im Hub angezeigt, nie blockierend.
 * Vesktops Update-Prüfung und Vencords Updater sind entfernt bzw. per --disable-updater abgeschaltet.
 */

import { app, BrowserWindow } from "electron";
import { autoUpdater, ProgressInfo, UpdateInfo } from "electron-updater";

import type {
    LarpUpdateChannel,
    LarpUpdaterOptions,
    LarpUpdaterStatus
} from "../../../core/src/plugins/larpCore/updater/types";
import { IpcEvents } from "../shared/IpcEvents";
import { PORTABLE } from "./constants";
import { AppEvents } from "./events";
import { Settings } from "./settings";
import { handle } from "./utils/ipcWrappers";

const CHECK_INTERVAL = 4 * 60 * 60 * 1000;
const FIRST_CHECK_DELAY = 15 * 1000;

const log = {
    info: (...args: any[]) => console.log("[Larpcord Updater]", ...args),
    warn: (...args: any[]) => console.warn("[Larpcord Updater]", ...args),
    error: (...args: any[]) => console.error("[Larpcord Updater]", ...args),
    debug: () => {}
};

/**
 * Updates gehen nur mit installierter App (NSIS). Dev-Builds und die portable win-unpacked-Version nicht.
 * Zum Testen: LARPCORD_DEV_UPDATER=1 setzen und desktop/dev-app-update.yml mit einem Update-Server anlegen.
 */
const DEV_UPDATER = process.env.LARPCORD_DEV_UPDATER === "1";
export const UPDATER_SUPPORTED = (app.isPackaged && !PORTABLE && process.platform === "win32") || DEV_UPDATER;

function options() {
    const o = Settings.store.larpUpdater ?? {};
    return {
        autoUpdate: o.autoUpdate ?? true,
        channel: (o.channel === "beta" ? "beta" : "stable") as LarpUpdateChannel
    };
}

let status: LarpUpdaterStatus = {
    state: UPDATER_SUPPORTED ? "idle" : "unsupported",
    currentVersion: app.getVersion(),
    ...options()
};

function setStatus(patch: Partial<LarpUpdaterStatus>) {
    status = { ...status, ...patch, ...options(), currentVersion: app.getVersion() };
    for (const win of BrowserWindow.getAllWindows()) {
        if (!win.isDestroyed()) win.webContents.send(IpcEvents.LARP_UPDATER_STATUS, status);
    }
}

function toInfo(info: UpdateInfo) {
    const notes = info.releaseNotes;
    return {
        version: info.version,
        releaseName: info.releaseName,
        releaseDate: info.releaseDate,
        // Mit fullChangelog = false ist das ein String (HTML aus dem GitHub-Release)
        releaseNotes:
            typeof notes === "string" ? notes : Array.isArray(notes) ? notes.map(n => n.note ?? "").join("\n") : null
    };
}

function shortError(err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    // Nur die erste Zeile (electron-updater hängt teils ganze Stacktraces/XML an)
    return msg.split("\n")[0].slice(0, 300);
}

function applyOptions() {
    const { channel } = options();
    autoUpdater.allowPrerelease = channel === "beta";
    autoUpdater.allowDowngrade = false;
}

let checking: Promise<LarpUpdaterStatus> | null = null;

export function checkForUpdates(reason: "start" | "interval" | "manual" | "channel"): Promise<LarpUpdaterStatus> {
    if (!UPDATER_SUPPORTED) return Promise.resolve(status);
    if (status.state === "downloading" || status.state === "downloaded") return Promise.resolve(status);
    if (checking) return checking;

    log.info(`Suche nach Updates (${reason}, Kanal ${options().channel})`);
    applyOptions();
    checking = autoUpdater
        .checkForUpdates()
        .then(() => status)
        .catch(err => {
            log.warn("Update-Prüfung fehlgeschlagen:", shortError(err));
            setStatus({ state: "error", error: shortError(err), lastCheck: Date.now() });
            return status;
        })
        .finally(() => {
            checking = null;
        });
    return checking;
}

let interval: NodeJS.Timeout | undefined;

function scheduleChecks() {
    clearInterval(interval);
    interval = undefined;
    if (!UPDATER_SUPPORTED || !options().autoUpdate) return;
    interval = setInterval(() => checkForUpdates("interval"), CHECK_INTERVAL);
}

function setOptions(next: LarpUpdaterOptions) {
    const prev = options();
    const merged = { ...Settings.store.larpUpdater };
    if (typeof next?.autoUpdate === "boolean") merged.autoUpdate = next.autoUpdate;
    if (next?.channel === "stable" || next?.channel === "beta") merged.channel = next.channel;
    Settings.store.larpUpdater = merged;

    const now = options();
    applyOptions();
    scheduleChecks();

    // Nach Wechsel auf „Stabil“ kein bereits geladenes Beta-Update mehr beim Beenden installieren
    if (
        prev.channel === "beta" &&
        now.channel === "stable" &&
        status.state === "downloaded" &&
        status.update?.version.includes("-")
    ) {
        autoUpdater.autoInstallOnAppQuit = false;
        setStatus({ state: "idle", update: undefined, progress: undefined });
    } else {
        setStatus({});
    }

    if (UPDATER_SUPPORTED && prev.channel !== now.channel && now.autoUpdate) checkForUpdates("channel");
    if (UPDATER_SUPPORTED && !prev.autoUpdate && now.autoUpdate) checkForUpdates("start");
    return status;
}

function installNow() {
    if (status.state !== "downloaded") return false;
    log.info(`Installiere ${status.update?.version} und starte neu`);
    // before-quit setzt isQuitting (mainWindow.ts), damit „In den Tray minimieren“ das Beenden nicht abfängt
    setImmediate(() => {
        try {
            autoUpdater.quitAndInstall(true, true);
        } catch (err) {
            log.error("Installation fehlgeschlagen:", shortError(err));
            setStatus({ state: "error", error: shortError(err) });
        }
    });
    return true;
}

if (UPDATER_SUPPORTED) {
    autoUpdater.logger = log;
    if (DEV_UPDATER) autoUpdater.forceDevUpdateConfig = true;
    autoUpdater.autoDownload = true;
    autoUpdater.autoInstallOnAppQuit = true;
    autoUpdater.fullChangelog = false;
    applyOptions();

    autoUpdater.on("checking-for-update", () => setStatus({ state: "checking", error: undefined }));
    autoUpdater.on("update-not-available", () =>
        setStatus({ state: "not-available", lastCheck: Date.now(), error: undefined })
    );
    autoUpdater.on("update-available", (info: UpdateInfo) => {
        autoUpdater.autoInstallOnAppQuit = true;
        setStatus({ state: "downloading", update: toInfo(info), progress: 0, lastCheck: Date.now(), error: undefined });
    });
    autoUpdater.on("download-progress", (p: ProgressInfo) =>
        setStatus({ state: "downloading", progress: Math.round(p.percent) })
    );
    autoUpdater.on("update-downloaded", (info: UpdateInfo) => {
        log.info(`Update ${info.version} geladen, wird spätestens beim Beenden installiert`);
        setStatus({ state: "downloaded", update: toInfo(info), progress: 100 });
    });
    autoUpdater.on("error", err => {
        log.warn("Fehler:", shortError(err));
        // Ein bereits geladenes Update bleibt installierbar
        if (status.state !== "downloaded") setStatus({ state: "error", error: shortError(err), lastCheck: Date.now() });
    });

    AppEvents.once("appLoaded", () => {
        setTimeout(() => {
            if (options().autoUpdate) checkForUpdates("start");
        }, FIRST_CHECK_DELAY);
        scheduleChecks();
    });
}

handle(IpcEvents.LARP_UPDATER_GET_STATUS, () => status);
handle(IpcEvents.LARP_UPDATER_CHECK, () => checkForUpdates("manual"));
handle(IpcEvents.LARP_UPDATER_SET_OPTIONS, (_, next: LarpUpdaterOptions) => setOptions(next));
handle(IpcEvents.LARP_UPDATER_INSTALL, () => installNow());
handle(IpcEvents.LARP_UPDATER_DISMISS, (_, version: unknown) => {
    if (typeof version === "string" && version.length < 64) setStatus({ dismissedVersion: version });
    return status;
});

