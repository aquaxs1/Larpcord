/*
 * Larpcord, a standalone Discord client for local cosmetic larping
 * Copyright (c) 2026 Larpcord contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { LarpPreset, LarpProfile } from "./types";

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

function preset(name: string, overrides: Partial<LarpProfile>): LarpPreset {
    return { name, builtin: true, profile: { ...createDefaultProfile(), ...overrides } };
}

export const BUILTIN_PRESETS: LarpPreset[] = [
    preset("Discord Staff", {
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
    preset("Nitro-Gönner", {
        badges: { builtin: ["hypesquad_house_2", "quest_completed"], custom: [] },
        nitro: { enabled: true, since: "2018-03-01T00:00:00.000Z", boostSince: "2019-10-01T00:00:00.000Z" },
        profile: { themeColors: ["#ff73fa", "#7289da"] },
        nameStyle: { gradient: ["#ff73fa", "#7289da"], glow: true }
    }),
    preset("OG 2015", {
        badges: { builtin: ["early_supporter", "hypesquad_house_1", "bug_hunter_level_1", "legacy_username"], custom: [] },
        memberSince: "2015-05-13T00:00:00.000Z",
        clanTag: { tag: "OG" },
        nitro: { enabled: true, since: "2017-01-23T00:00:00.000Z" },
        profile: { themeColors: ["#7289da", "#99aab5"] },
        extras: { verifiedCheck: false, ownerCrown: true }
    })
];
