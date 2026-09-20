/*
 * Vesktop, a desktop app aiming to give you a snappier Discord Experience
 * Copyright (c) 2025 Vendicated and Vesktop contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { app, dialog, nativeImage, net } from "electron";
import { existsSync } from "fs";
import { copyFile, mkdir, rm } from "fs/promises";
import { join } from "path";
import { IpcEvents } from "shared/IpcEvents";
import { STATIC_DIR } from "shared/paths";
import { pathToFileURL } from "url";

import { DATA_DIR } from "./constants";
import { AppEvents } from "./events";
import { t } from "./i18n";
import { mainWin } from "./mainWindow";
import { fileExistsAsync } from "./utils/fileExists";
import { handle } from "./utils/ipcWrappers";

// Larpcord: zusätzlich "appIcon" (Fenster-/Taskleisten-Icon)
const CUSTOMIZABLE_ASSETS = ["splash", "tray", "trayUnread", "appIcon"] as const;
export type UserAssetType = (typeof CUSTOMIZABLE_ASSETS)[number];

const DEFAULT_ASSETS: Record<UserAssetType, string> = {
    splash: "splash.webp",
    tray: `tray/${process.platform === "darwin" ? "trayTemplate" : "tray"}.png`,
    trayUnread: "tray/trayUnread.png",
    appIcon: "icon.png"
};

const UserAssetFolder = join(DATA_DIR, "userAssets");

export async function resolveAssetPath(asset: UserAssetType) {
    if (!CUSTOMIZABLE_ASSETS.includes(asset)) {
        throw new Error(`Invalid asset: ${asset}`);
    }

    const assetPath = join(UserAssetFolder, asset);
    if (await fileExistsAsync(assetPath)) {
        return assetPath;
    }

    return join(STATIC_DIR, DEFAULT_ASSETS[asset]);
}

/** Synchrone Variante, z. B. beim Erstellen des Hauptfensters */
export function resolveAssetPathSync(asset: UserAssetType) {
    const assetPath = join(UserAssetFolder, asset);
    return existsSync(assetPath) ? assetPath : join(STATIC_DIR, DEFAULT_ASSETS[asset]);
}

/** Larpcord: eigenes App-Icon auf ein Fenster anwenden (nur Formate, die Electron lesen kann) */
export function applyAppIcon(win: Electron.BrowserWindow | undefined) {
    if (!win || win.isDestroyed()) return;
    try {
        const image = nativeImage.createFromPath(resolveAssetPathSync("appIcon"));
        if (!image.isEmpty()) win.setIcon(image);
    } catch (e) {
        console.error("Failed to apply app icon", e);
    }
}

AppEvents.on("userAssetChanged", asset => {
    if (asset === "appIcon") applyAppIcon(mainWin);
});

export async function handleVesktopAssetsProtocol(path: string, req: Request) {
    const asset = path.slice(1);

    // @ts-expect-error dumb types
    if (!CUSTOMIZABLE_ASSETS.includes(asset)) {
        return new Response(null, { status: 404 });
    }

    try {
        const res = await net.fetch(pathToFileURL(join(UserAssetFolder, asset)).href);
        if (res.ok) return res;
    } catch {}

    return net.fetch(pathToFileURL(join(STATIC_DIR, DEFAULT_ASSETS[asset])).href);
}

handle(IpcEvents.CHOOSE_USER_ASSET, async (_event, asset: UserAssetType, value?: null) => {
    if (!CUSTOMIZABLE_ASSETS.includes(asset)) {
        throw `Invalid asset: ${asset}`;
    }

    const assetPath = join(UserAssetFolder, asset);

    if (value === null) {
        try {
            await rm(assetPath, { force: true });
            AppEvents.emit("userAssetChanged", asset);
            return "ok";
        } catch (e) {
            console.error(`Failed to remove user asset ${asset}:`, e);
            return "failed";
        }
    }

    const res = await dialog.showOpenDialog(mainWin, {
        properties: ["openFile"],
        // i18n-keys: desktop.userAssets.asset.* (splash, tray, trayUnread, appIcon)
        title: t("desktop.userAssets.dialogTitle", { asset: t(`desktop.userAssets.asset.${asset}`) }),
        defaultPath: app.getPath("pictures"),
        filters: [
            {
                name: t("desktop.userAssets.filterImages"),
                extensions: ["png", "jpg", "jpeg", "webp", "gif", "avif", "svg"]
            }
        ]
    });

    if (res.canceled || !res.filePaths.length) return "cancelled";

    try {
        await mkdir(UserAssetFolder, { recursive: true });
        await copyFile(res.filePaths[0], assetPath);
        AppEvents.emit("userAssetChanged", asset);
        return "ok";
    } catch (e) {
        console.error(`Failed to copy user asset ${asset}:`, e);
        return "failed";
    }
});
