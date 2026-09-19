/*
 * Larpcord, a standalone Discord client for local cosmetic larping
 * Copyright (c) 2026 Larpcord contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { patches } from "@webpack/patcher";

import { logger } from "./store";

/*
 * Regel 6: Findet ein Patch nach einem Discord-Update sein Modul nicht mehr, wendet Vencord ihn
 * einfach nicht an (nichts crasht, das Feature ist aus). Das meldet Vencord zur Laufzeit aber nicht.
 * Deshalb listet Larpcord nach dem Start alle Larp-Patches auf, die noch nicht angewendet wurden.
 * Hinweis: Module, die Discord erst bei Bedarf lädt (z. B. Einstellungen), erscheinen hier ebenfalls,
 * bis sie einmal geöffnet wurden.
 */

export interface PendingPatch {
    plugin: string;
    find: string;
}

export function getPendingLarpPatches(): PendingPatch[] {
    return patches
        .filter(p => p.plugin?.startsWith("Larp"))
        .map(p => ({ plugin: p.plugin, find: String(p.find) }));
}

let timer: ReturnType<typeof setTimeout> | undefined;

export function schedulePatchHealthCheck(delayMs = 20_000) {
    clearTimeout(timer);
    timer = setTimeout(() => {
        const pending = getPendingLarpPatches();
        if (!pending.length) {
            logger.info("Patch-Status: alle Larp-Patches angewendet");
            return;
        }
        logger.warn(
            `Patch-Status: ${pending.length} Larp-Patch(es) nicht angewendet. Entweder ist das Modul noch nicht geladen `
            + "oder Discord hat sich geändert, dann ist das zugehörige Feature inaktiv (ohne Absturz): "
            + pending.map(p => `${p.plugin} → ${p.find}`).join(" | ")
        );
    }, delayMs);
}

export function cancelPatchHealthCheck() {
    clearTimeout(timer);
}
