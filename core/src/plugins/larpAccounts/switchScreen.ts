/*
 * Larpcord, a standalone Discord client for local cosmetic larping
 * Copyright (c) 2026 Larpcord contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { t } from "@plugins/larpCore/i18n";

/*
 * Discord-style loading screen for a larp account switch, so it feels like a real one.
 * Plain DOM on top of the app: it has to cover Discord's whole UI, including popouts and modals.
 * The animation is our own CSS (no Discord assets are copied into the repo).
 */

const TIP_COUNT = 5;
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

/** Shows the loading screen, runs `swap` while it covers the app, then fades out */
export async function showSwitchScreen(swap: () => void) {
    const root = document.createElement("div");
    root.className = "larp-switch-screen";
    root.setAttribute("role", "status");

    const spinner = document.createElement("div");
    spinner.className = "larp-switch-cubes";
    spinner.append(document.createElement("span"), document.createElement("span"));

    const title = document.createElement("div");
    title.className = "larp-switch-title";
    title.textContent = t("accounts.loading.title");

    const tip = document.createElement("div");
    tip.className = "larp-switch-tip";
    // i18n-keys: accounts.loading.tip.* (random tip)
    tip.textContent = t(`accounts.loading.tip.${1 + Math.floor(Math.random() * TIP_COUNT)}`);

    root.append(spinner, title, tip);
    document.body.appendChild(root);

    try {
        // Fade in, swap the profile behind the screen, keep it up long enough to look like a reconnect
        await sleep(30);
        root.classList.add("larp-switch-visible");
        await sleep(250);
        swap();
        await sleep(900 + Math.random() * 700);
        root.classList.remove("larp-switch-visible");
        await sleep(300);
    } finally {
        root.remove();
    }
}
