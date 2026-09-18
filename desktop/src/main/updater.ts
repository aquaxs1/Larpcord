/*
 * Vesktop, a desktop app aiming to give you a snappier Discord Experience
 * Copyright (c) 2025 Vendicated and Vesktop contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { IpcEvents } from "shared/IpcEvents";

import { handle } from "./utils/ipcWrappers";

// Larpcord: Der Vesktop-Auto-Updater (electron-updater → GitHub Vencord/Vesktop) ist deaktiviert,
// sonst würde Larpcord durch ein offizielles Vesktop ersetzt. Updates kommen über Larpcord-Releases.
handle(IpcEvents.UPDATER_IS_OUTDATED, () => false);
handle(IpcEvents.UPDATER_OPEN, () => {});
