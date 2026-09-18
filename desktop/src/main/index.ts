/*
 * Vesktop, a desktop app aiming to give you a snappier Discord Experience
 * Copyright (c) 2026 Vendicated and Vesktop contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { app } from "electron";

import { CommandLine } from "./cli";

if (CommandLine.values.repair) {
    // Larpcord: Der Core ist Teil der App, es gibt nichts herunterzuladen.
    console.log("Larpcord bringt seinen Core mit. Zum Reparieren bitte neu installieren.");
    app.quit();
} else {
    require("./main");
}
