/*
 * Vesktop, a desktop app aiming to give you a snappier Discord Experience
 * Copyright (c) 2023 Vendicated and Vencord contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { app, dialog } from "electron";
import { access, constants as FsConstants } from "fs/promises";
import { VENCORD_FILES_DIR } from "main/vencordFilesDir";
import { join } from "path";

// Larpcord: Kein Download mehr aus GitHub-Releases. Der Larpcord-Core liegt in den App-Ressourcen.
export const VENCORD_FILES = [
    "vencordDesktopMain.js",
    "vencordDesktopPreload.js",
    "vencordDesktopRenderer.js",
    "vencordDesktopRenderer.css"
];

const existsAsync = (path: string) =>
    access(path, FsConstants.F_OK)
        .then(() => true)
        .catch(() => false);

export async function isValidVencordInstall(dir: string) {
    const results = await Promise.all(VENCORD_FILES.map(f => existsAsync(join(dir, f))));
    return !results.includes(false);
}

export async function ensureVencordFiles() {
    if (await isValidVencordInstall(VENCORD_FILES_DIR)) return;

    dialog.showErrorBox(
        "Larpcord",
        `Der Larpcord-Core wurde nicht gefunden:\n${VENCORD_FILES_DIR}\n\nBitte Larpcord neu installieren (bzw. im Dev-Modus zuerst "pnpm build" ausführen).`
    );
    app.exit(1);
}
