/*
 * Larpcord, a standalone Discord client for local cosmetic larping
 * Copyright (c) 2026 Larpcord contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { LarpProfile } from "./types";
import { sanitizeProfile } from "./validate";

/*
 * Larp sync: which parts of a larp profile other Larpcord users get to see.
 *
 * Shared: profile look (badges, Nitro look, banner, colors, avatar, decoration, effect, nameplate, name style,
 * clan tag, extras), connections, the display name and own activities.
 * Never shared: username, music, server settings (roles, restyles), themes, sounds, layout, activity rules.
 *
 * The server stores what it gets as opaque JSON, so every received profile runs through sanitizeProfile()
 * again here before it is displayed.
 */

export const SHARED_FORMAT = 1;

/** Shared part of the own profile, as uploaded to the sync server */
export function toSharedProfile(p: LarpProfile): Record<string, unknown> {
    const activities = p.activities?.enabled
        ? p.activities.list.filter(a => a.enabled)
        : [];
    return {
        format: SHARED_FORMAT,
        badges: p.badges,
        badgeOrder: p.badgeOrder,
        memberSince: p.memberSince,
        clanTag: p.clanTag,
        nitro: p.nitro,
        profile: p.profile,
        decoration: p.decoration,
        profileEffect: p.profileEffect,
        nameplate: p.nameplate,
        nameplateData: p.nameplateData,
        nameStyle: p.nameStyle,
        extras: p.extras,
        names: { displayName: p.names.displayName, overrideNicknames: p.names.overrideNicknames },
        activities: activities.length ? { enabled: true, list: activities, rules: [] } : undefined,
        connections: p.connections
    };
}

/**
 * Received profile of another user → displayable LarpProfile with only the shared fields.
 * Activity IDs get the user ID as a prefix so asset keys and timers never collide with the own ones.
 */
export function fromSharedProfile(userId: string, raw: unknown): LarpProfile | undefined {
    if (raw == null || typeof raw !== "object" || Array.isArray(raw)) return undefined;
    const p = sanitizeProfile(raw);
    p.servers = {};
    p.watermark = false;
    p.names = { displayName: p.names.displayName, overrideNicknames: p.names.overrideNicknames };
    delete p.theme;
    delete p.sounds;
    delete p.music;
    delete p.layout;
    if (p.activities) {
        const list = p.activities.enabled ? p.activities.list.filter(a => a.enabled) : [];
        if (list.length) {
            p.activities = {
                enabled: true,
                rules: [],
                list: list.map(a => ({
                    ...a,
                    id: `u${userId}-${a.id}`,
                    // The progress bar only exists by posing as Spotify. On someone else's profile Discord would
                    // then offer "Listen along" / "Play on Spotify", which act server-side → plain "Listening" (rule 7)
                    times: a.times?.mode === "progress" ? { ...a.times, mode: "since", seconds: a.times.elapsed ?? 0 } : a.times
                }))
            };
        } else delete p.activities;
    }
    return p;
}
