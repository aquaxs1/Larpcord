/*
 * Vesktop, a desktop app aiming to give you a snappier Discord Experience
 * Copyright (c) 2023 Vendicated and Vencord contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { app, BrowserWindow } from "electron";

import { getViewStrings, t } from "./i18n";
import { makeLinksOpenExternally } from "./utils/makeLinksOpenExternally";
import { loadView } from "./vesktopStatic";

export async function createAboutWindow() {
    const height = 750;
    const width = height * (4 / 3);

    const about = new BrowserWindow({
        // Titel bis about.html geladen ist (danach setzt die Seite ihren übersetzten <title>)
        title: t("desktop.menu.about"),
        center: true,
        autoHideMenuBar: true,
        height,
        width
    });

    makeLinksOpenExternally(about);

    const data = new URLSearchParams({
        APP_VERSION: app.getVersion(),
        // Larpcord: about.html hat keinen Preload, die Übersetzungen (desktop.*) kommen deshalb als JSON mit
        I18N: JSON.stringify(getViewStrings())
    });

    loadView(about, "about.html", data);

    return about;
}
