/*
 * Larpcord, a standalone Discord client for local cosmetic larping
 * Copyright (c) 2026 Larpcord contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { logger } from "@plugins/larpCore/store";
import { findStoreLazy } from "@webpack";

import { activityMatchKeys, DiscordActivity } from "./activities";

/*
 * Echte, vom Client erkannte Aktivitäten (laufende Spiele, Musik …) für den Aktivitäts-Changer.
 * Gelesen wird getUnfilteredActivities(): diese Methode ist nicht gepatcht und liefert deshalb
 * immer die echten Einträge, nie die eigenen Larp-Aktivitäten.
 */

const SelfPresenceStore = findStoreLazy("SelfPresenceStore");

export interface DetectedActivity {
    /** Schlüssel für die Regel (application_id oder Name in Kleinschreibung) */
    match: string;
    /** Anzeige im Hub */
    label: string;
}

export function detectedActivities(): DetectedActivity[] {
    try {
        const raw: DiscordActivity[] = SelfPresenceStore?.getUnfilteredActivities?.() ?? [];
        const out: DetectedActivity[] = [];
        const seen = new Set<string>();
        for (const a of raw) {
            // Der benutzerdefinierte Status ist keine Anwendung
            if (!a || a.type === 4) continue;
            const match = activityMatchKeys(a)[0];
            if (!match || seen.has(match)) continue;
            seen.add(match);
            out.push({ match, label: a.name || match });
        }
        return out;
    } catch (e) {
        logger.warn("Erkannte Aktivitäten konnten nicht gelesen werden", e);
        return [];
    }
}
