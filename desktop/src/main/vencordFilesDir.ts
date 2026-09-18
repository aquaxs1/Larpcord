/*
 * Vesktop, a desktop app aiming to give you a snappier Discord Experience
 * Copyright (c) 2025 Vendicated and Vesktop contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { app } from "electron";
import { join } from "path";

import { State } from "./settings";

// Larpcord: Der Core wird mit der App ausgeliefert (electron-builder extraResources → resources/vencord)
// statt aus Vencord-GitHub-Releases heruntergeladen. Im Dev-Modus liegt er unter desktop/vencord.
export const BUNDLED_VENCORD_DIR = app.isPackaged
    ? join(process.resourcesPath, "vencord")
    : join(__dirname, "..", "..", "vencord");

// this is in a separate file to avoid circular dependencies
export const VENCORD_FILES_DIR = State.store.vencordDir || BUNDLED_VENCORD_DIR;
