/*
 * Larpcord, a standalone Discord client for local cosmetic larping
 * Copyright (c) 2026 Larpcord contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

/*
 * Connection platforms by Discord's own type names. Discord renders icon, colors and link of a
 * connected account from this type, so larp connections look exactly like real ones.
 * Labels are brand names and stay untranslated.
 */
export const CONNECTION_PLATFORMS: { type: string; label: string; color: string; }[] = [
    { type: "battlenet", label: "Battle.net", color: "#148eff" },
    { type: "bluesky", label: "Bluesky", color: "#1185fe" },
    { type: "bungie", label: "Bungie.net", color: "#0e7eb8" },
    { type: "crunchyroll", label: "Crunchyroll", color: "#f47521" },
    { type: "domain", label: "Domain", color: "#5865f2" },
    { type: "ebay", label: "eBay", color: "#0064d2" },
    { type: "epicgames", label: "Epic Games", color: "#313131" },
    { type: "facebook", label: "Facebook", color: "#1877f2" },
    { type: "github", label: "GitHub", color: "#24292f" },
    { type: "instagram", label: "Instagram", color: "#e1306c" },
    { type: "leagueoflegends", label: "League of Legends", color: "#c89b3c" },
    { type: "mastodon", label: "Mastodon", color: "#6364ff" },
    { type: "paypal", label: "PayPal", color: "#003087" },
    { type: "playstation", label: "PlayStation Network", color: "#003791" },
    { type: "reddit", label: "Reddit", color: "#ff4500" },
    { type: "riotgames", label: "Riot Games", color: "#d13639" },
    { type: "roblox", label: "Roblox", color: "#393b3d" },
    { type: "spotify", label: "Spotify", color: "#1db954" },
    { type: "steam", label: "Steam", color: "#1b2838" },
    { type: "tiktok", label: "TikTok", color: "#010101" },
    { type: "twitch", label: "Twitch", color: "#9146ff" },
    { type: "twitter", label: "X", color: "#000000" },
    { type: "xbox", label: "Xbox", color: "#107c10" },
    { type: "youtube", label: "YouTube", color: "#ff0000" },
];

export function platformOf(type: string) {
    return CONNECTION_PLATFORMS.find(p => p.type === type) ?? { type, label: type, color: "#4e5058" };
}
