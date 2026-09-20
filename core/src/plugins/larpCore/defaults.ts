/*
 * Larpcord, a standalone Discord client for local cosmetic larping
 * Copyright (c) 2026 Larpcord contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import LOCALES from "~larpcord-locales";

import { t } from "./i18n";
import { BuiltinPresetId, LarpPreset, LarpProfile } from "./types";

export function createDefaultProfile(): LarpProfile {
    return {
        badges: { builtin: [], custom: [] },
        nitro: { enabled: false },
        profile: {},
        extras: { verifiedCheck: false, ownerCrown: false },
        names: { overrideNicknames: true },
        servers: {},
        watermark: false
    };
}

/** Anzeigename eines mitgelieferten Presets in der aktuellen Sprache */
export function builtinPresetName(id: BuiltinPresetId) {
    return t(`preset.builtin.${id}`); // i18n-keys: preset.builtin.*
}

/**
 * Mitgelieferte Presets werden über ihre stabile ID erkannt (builtinId), nicht über den Namen.
 * `name` ist ein Getter und liefert immer die Anzeige in der aktuellen Sprache.
 */
function preset(id: BuiltinPresetId, overrides: Partial<LarpProfile>): LarpPreset {
    return {
        get name() {
            return builtinPresetName(id);
        },
        builtin: true,
        builtinId: id,
        profile: { ...createDefaultProfile(), ...overrides }
    };
}

export const BUILTIN_PRESETS: LarpPreset[] = [
    preset("staff", {
        badges: {
            builtin: ["staff", "partner", "certified_moderator", "hypesquad", "bug_hunter_level_2", "active_developer", "verified_developer", "early_supporter"],
            custom: []
        },
        memberSince: "2015-05-13T00:00:00.000Z",
        nitro: { enabled: true, since: "2017-01-23T00:00:00.000Z", boostSince: "2019-06-01T00:00:00.000Z" },
        profile: { themeColors: ["#5865f2", "#23272a"] },
        extras: { verifiedCheck: true, ownerCrown: false },
        nameStyle: { glow: true }
    }),
    preset("nitro", {
        badges: { builtin: ["hypesquad_house_2", "quest_completed"], custom: [] },
        nitro: { enabled: true, since: "2018-03-01T00:00:00.000Z", boostSince: "2019-10-01T00:00:00.000Z" },
        profile: { themeColors: ["#ff73fa", "#7289da"] },
        nameStyle: { gradient: ["#ff73fa", "#7289da"], glow: true }
    }),
    preset("og2015", {
        badges: { builtin: ["early_supporter", "hypesquad_house_1", "bug_hunter_level_1", "legacy_username"], custom: [] },
        memberSince: "2015-05-13T00:00:00.000Z",
        clanTag: { tag: "OG" },
        nitro: { enabled: true, since: "2017-01-23T00:00:00.000Z" },
        profile: { themeColors: ["#7289da", "#99aab5"] },
        extras: { verifiedCheck: false, ownerCrown: true }
    })
];

/** Frühere (feste, deutsche) Namen der mitgelieferten Presets, für die Migration gespeicherter Daten */
export const LEGACY_BUILTIN_NAMES: Record<string, BuiltinPresetId> = {
    "Discord Staff": "staff",
    "Nitro-Gönner": "nitro",
    "OG 2015": "og2015"
};

export function findBuiltinPreset(id: string) {
    return BUILTIN_PRESETS.find(p => p.builtinId === id);
}

const normalizeName = (name: string) => name.trim().toLocaleLowerCase();

/**
 * Eigene Presets dürfen nicht so heißen wie ein mitgeliefertes Preset, und zwar in keiner Sprache
 * (auch nicht wie die früheren deutschen Namen). Sonst gäbe es nach einem Sprachwechsel zwei gleich
 * benannte Einträge. Vergleich ohne Groß-/Kleinschreibung und ohne Leerzeichen am Rand.
 */
export function isReservedPresetName(name: string) {
    const n = normalizeName(name);
    if (!n) return false;
    for (const legacy of Object.keys(LEGACY_BUILTIN_NAMES)) {
        if (normalizeName(legacy) === n) return true;
    }
    for (const p of BUILTIN_PRESETS) {
        if (normalizeName(p.name) === n) return true;
        for (const dict of Object.values(LOCALES)) {
            const text = dict[`preset.builtin.${p.builtinId}`];
            if (text && normalizeName(text) === n) return true;
        }
    }
    return false;
}
