/*
 * Larpcord, a standalone Discord client for local cosmetic larping
 * Copyright (c) 2026 Larpcord contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { OFFICIAL_BADGE_IDS } from "./badges";
import { createDefaultProfile } from "./defaults";
import { LarpError } from "./i18n";
import { CustomBadge, LarpActivities, LarpActivity, LarpActivityFields, LarpActivityRule, LarpActivityTimes, LarpActivityType, LarpButtonLayout, LarpExportFile, LarpLayout, LarpPreset, LarpProfile, LarpRole, LarpSounds, LarpTheme, ServerLarp } from "./types";

/*
 * Bereinigt beliebige (importierte oder gespeicherte) Daten zu einem gültigen LarpProfile.
 * Unbekannte Felder werden verworfen, ungültige Werte fallen auf Standardwerte zurück.
 */

const MAX_STR = 200;
const MAX_URL = 2_000_000; // data:-URLs für eigene Badges/Sounds dürfen groß sein
const MAX_CUSTOM_BADGES = 50;
const MAX_PRESETS = 100;

const isObj = (v: unknown): v is Record<string, unknown> => v != null && typeof v === "object" && !Array.isArray(v);

function str(v: unknown, max = MAX_STR): string | undefined {
    if (typeof v !== "string") return undefined;
    const s = v.trim();
    return s ? s.slice(0, max) : undefined;
}

function bool(v: unknown, fallback = false) {
    return typeof v === "boolean" ? v : fallback;
}

/** Nur https:-URLs und data:image/-URLs (bzw. data:audio/ für Sounds) sind erlaubt */
export function safeUrl(v: unknown, allowDataPrefix = "data:image/"): string | undefined {
    const s = str(v, MAX_URL);
    if (!s) return undefined;
    if (s.startsWith(allowDataPrefix)) return /^data:[\w.+-]+\/[\w.+-]+;base64,[A-Za-z0-9+/=]+$/.test(s) ? s : undefined;
    try {
        return new URL(s).protocol === "https:" ? s : undefined;
    } catch {
        return undefined;
    }
}

export function safeColor(v: unknown): string | undefined {
    return typeof v === "string" && /^#[0-9a-f]{6}$/i.test(v) ? v.toLowerCase() : undefined;
}

export function safeDate(v: unknown): string | undefined {
    if (typeof v !== "string") return undefined;
    const d = new Date(v);
    const t = d.getTime();
    // Discord gibt es seit 2015, Daten in der Zukunft ergeben keinen Sinn
    if (isNaN(t) || t < Date.UTC(2015, 0, 1) || t > Date.now() + 86_400_000) return undefined;
    return d.toISOString();
}

/** Namen: wie bei Discord max. 32 Zeichen, ohne Steuerzeichen und Zeilenumbrüche */
function name(v: unknown): string | undefined {
    if (typeof v !== "string") return undefined;
    return str(v.replace(/[\u0000-\u001f\u007f\u2028\u2029]/g, ""), 32);
}

function colorPair(v: unknown): [string, string] | undefined {
    if (!Array.isArray(v) || v.length !== 2) return undefined;
    const a = safeColor(v[0]), b = safeColor(v[1]);
    return a && b ? [a, b] : undefined;
}

function customBadge(v: unknown): CustomBadge | undefined {
    if (!isObj(v)) return undefined;
    const imageUrl = safeUrl(v.imageUrl);
    const tooltip = str(v.tooltip, 100);
    if (!imageUrl || !tooltip) return undefined;
    const id = str(v.id, 40)?.replace(/[^\w-]/g, "") || Math.random().toString(36).slice(2, 10);
    return { id, imageUrl, tooltip };
}

const MAX_ROLES_PER_GUILD = 20;

function larpRole(v: unknown): LarpRole | undefined {
    if (!isObj(v)) return undefined;
    const name = str(v.name, 100);
    if (!name) return undefined;
    return {
        id: str(v.id, 40)?.replace(/[^\w-]/g, "") || Math.random().toString(36).slice(2, 10),
        name,
        color: safeColor(v.color) ?? "#99aab5",
        gradient: safeColor(v.gradient),
        iconUrl: safeUrl(v.iconUrl),
        assigned: bool(v.assigned, true)
    };
}

function serverLarp(v: unknown): ServerLarp | undefined {
    if (!isObj(v)) return undefined;
    const out: ServerLarp = {};
    if (typeof v.partner === "boolean") out.partner = v.partner;
    if (typeof v.verified === "boolean") out.verified = v.verified;
    if ([0, 1, 2, 3].includes(v.boostLevel as number)) out.boostLevel = v.boostLevel as ServerLarp["boostLevel"];
    if (typeof v.boostCount === "number" && Number.isFinite(v.boostCount))
        out.boostCount = Math.max(0, Math.min(999_999, Math.floor(v.boostCount)));
    if (Array.isArray(v.roles)) {
        const roles = v.roles.map(larpRole).filter(Boolean).slice(0, MAX_ROLES_PER_GUILD) as LarpRole[];
        if (roles.length) out.roles = roles;
    }
    return Object.keys(out).length ? out : undefined;
}

function theme(v: unknown): LarpTheme | undefined {
    if (!isObj(v)) return undefined;
    const t: LarpTheme = { enabled: bool(v.enabled) };
    const accent = safeColor(v.accent), bg = safeColor(v.background), bg2 = safeColor(v.backgroundSecondary), text = safeColor(v.text);
    if (accent) t.accent = accent;
    if (bg) t.background = bg;
    if (bg2) t.backgroundSecondary = bg2;
    if (text) t.text = text;
    // Schriftnamen: nur harmlose Zeichen, damit daraus kein CSS ausbrechen kann
    const font = str(v.font, 80)?.replace(/[^\w\s-]/g, "");
    if (font) t.font = font;
    if (typeof v.radius === "number" && Number.isFinite(v.radius)) t.radius = Math.max(0, Math.min(32, v.radius));
    return t;
}

function sounds(v: unknown): LarpSounds | undefined {
    if (!isObj(v)) return undefined;
    const out: LarpSounds = {};
    const message = safeUrl(v.message, "data:audio/"), call = safeUrl(v.call, "data:audio/");
    if (message) out.message = message;
    if (call) out.call = call;
    return Object.keys(out).length ? out : undefined;
}

/** aria-labels landen später in CSS-Attributselektoren: nur druckbare Zeichen, begrenzte Länge */
function label(v: unknown): string | undefined {
    if (typeof v !== "string") return undefined;
    const s = v.replace(/[\u0000-\u001f\u007f\u2028\u2029]/g, "").trim();
    return s ? s.slice(0, 100) : undefined;
}

function labelList(v: unknown, max: number): string[] {
    if (!Array.isArray(v)) return [];
    return [...new Set(v.map(label).filter(Boolean) as string[])].slice(0, max);
}

function buttonLayout(v: unknown): LarpButtonLayout {
    const out: LarpButtonLayout = { order: [], hidden: [], labels: {} };
    if (!isObj(v)) return out;
    out.order = labelList(v.order, 50);
    out.hidden = labelList(v.hidden, 50);
    if (isObj(v.labels)) {
        for (const [k, list] of Object.entries(v.labels).slice(0, 50)) {
            const key = label(k);
            if (key) out.labels[key] = labelList(list, 10);
        }
    }
    return out;
}

function layout(v: unknown): LarpLayout | undefined {
    if (!isObj(v)) return undefined;
    const ids = (list: unknown, re: RegExp, max: number) =>
        Array.isArray(list) ? [...new Set(list.filter((x): x is string => typeof x === "string" && re.test(x)))].slice(0, max) : [];
    return {
        guildOrder: ids(v.guildOrder, /^(\d{15,21}|folder:\d{1,21})$/, 500),
        pinnedDms: ids(v.pinnedDms, /^\d{15,21}$/, 100),
        userPanel: buttonLayout(v.userPanel),
        channelHeader: buttonLayout(v.channelHeader),
        userPanelPosition: v.userPanelPosition === "top" ? "top" : "bottom"
    };
}

const MAX_ACTIVITIES = 10;
const MAX_ACTIVITY_RULES = 30;
const ACTIVITY_TYPES: LarpActivityType[] = [0, 1, 2, 3, 4, 5];

function int(v: unknown, min: number, max: number): number | undefined {
    if (typeof v !== "number" || !Number.isFinite(v)) return undefined;
    return Math.max(min, Math.min(max, Math.floor(v)));
}

/** Zufällige, stabile ID für Einträge ohne eigene */
function entryId(v: unknown): string {
    return str(v, 40)?.replace(/[^\w-]/g, "") || Math.random().toString(36).slice(2, 10);
}

function activityTimes(v: unknown): LarpActivityTimes | undefined {
    if (!isObj(v)) return undefined;
    const mode = v.mode;
    if (mode !== "since" && mode !== "until" && mode !== "progress") return undefined;
    const out: LarpActivityTimes = { mode, live: bool(v.live, true) };
    // Höchstens ein Jahr, damit aus Zahlenmüll keine unsinnigen Zeitangaben werden
    const seconds = int(v.seconds, 0, 31_536_000);
    if (seconds != null) out.seconds = seconds;
    const elapsed = int(v.elapsed, 0, 31_536_000);
    if (elapsed != null) out.elapsed = elapsed;
    // Zeitpunkte dürfen anders als bei Badges auch in der Zukunft liegen („noch bis …“)
    if (typeof v.at === "string") {
        const d = new Date(v.at);
        if (!isNaN(d.getTime())) out.at = d.toISOString();
    }
    if (!out.live && !out.at) out.live = true;
    return out;
}

/** Anzeige-Felder, die eigene Aktivitäten und Regeln gemeinsam haben */
function activityFields(v: Record<string, unknown>): LarpActivityFields {
    const out: LarpActivityFields = {
        name: str(v.name, 128),
        details: str(v.details, 128),
        state: str(v.state, 128),
        largeImage: safeUrl(v.largeImage),
        largeText: str(v.largeText, 128),
        smallImage: safeUrl(v.smallImage),
        smallText: str(v.smallText, 128),
        times: activityTimes(v.times)
    };
    return out;
}

function activity(v: unknown): LarpActivity | undefined {
    if (!isObj(v)) return undefined;
    const fields = activityFields(v);
    const name = fields.name;
    if (!name) return undefined;
    const type = ACTIVITY_TYPES.includes(v.type as LarpActivityType) ? v.type as LarpActivityType : 0;
    const out: LarpActivity = { ...fields, id: entryId(v.id), enabled: bool(v.enabled, true), type, name };

    if (Array.isArray(v.party) && v.party.length === 2) {
        const a = int(v.party[0], 0, 999_999), b = int(v.party[1], 0, 999_999);
        if (a != null && b != null && b > 0) out.party = [Math.min(a, b), b];
    }
    if (Array.isArray(v.buttons)) {
        const buttons = v.buttons.map(b => str(b, 32)).filter(Boolean) as string[];
        if (buttons.length) out.buttons = buttons.slice(0, 2);
    }
    // Nur Unicode-Emoji: erfundene Emoji-IDs würden auf nicht existierende CDN-Bilder zeigen,
    // deshalb keine Discord-Emoji-Schreibweise (<:name:id>) zulassen
    const emoji = str(v.emoji, 16);
    if (emoji && !/[:<>@a-zA-Z]/.test(emoji)) out.emoji = emoji;

    return out;
}

function activityRule(v: unknown): LarpActivityRule | undefined {
    if (!isObj(v)) return undefined;
    const match = str(v.match, 128)?.toLowerCase();
    if (!match) return undefined;
    return {
        ...activityFields(v),
        id: entryId(v.id),
        enabled: bool(v.enabled, true),
        match,
        label: str(v.label, 128),
        hide: bool(v.hide)
    };
}

function activities(v: unknown): LarpActivities | undefined {
    if (!isObj(v)) return undefined;
    const list = Array.isArray(v.list) ? v.list.map(activity).filter(Boolean).slice(0, MAX_ACTIVITIES) as LarpActivity[] : [];
    const rules = Array.isArray(v.rules) ? v.rules.map(activityRule).filter(Boolean).slice(0, MAX_ACTIVITY_RULES) as LarpActivityRule[] : [];
    if (!list.length && !rules.length) return undefined;
    return { enabled: bool(v.enabled, true), list, rules };
}

const SNOWFLAKE = /^\d{15,21}$/;
// Discord-Asset-Hashes, z. B. "a_1234abcd…" oder "v2_…"
const ASSET = /^[\w-]{8,80}$/;
const ID = /^\d{15,21}$/;

export function sanitizeProfile(input: unknown): LarpProfile {
    const p = createDefaultProfile();
    if (!isObj(input)) return p;

    if (isObj(input.badges)) {
        const { builtin, custom } = input.badges;
        if (Array.isArray(builtin))
            p.badges.builtin = [...new Set(builtin.filter((b): b is string => typeof b === "string" && OFFICIAL_BADGE_IDS.has(b)))];
        if (Array.isArray(custom))
            p.badges.custom = custom.map(customBadge).filter(Boolean).slice(0, MAX_CUSTOM_BADGES) as CustomBadge[];
    }
    if (Array.isArray(input.badgeOrder))
        p.badgeOrder = input.badgeOrder.filter((b): b is string => typeof b === "string" && b.length < 60).slice(0, 200);

    p.memberSince = safeDate(input.memberSince);

    if (isObj(input.clanTag)) {
        // Discord-Clan-Tags sind max. 4 Zeichen lang
        const tag = str(input.clanTag.tag, 4);
        if (tag) p.clanTag = { tag, iconUrl: safeUrl(input.clanTag.iconUrl) };
    }

    if (isObj(input.nitro)) {
        p.nitro = {
            enabled: bool(input.nitro.enabled),
            since: safeDate(input.nitro.since),
            boostSince: safeDate(input.nitro.boostSince)
        };
    }

    if (isObj(input.profile)) {
        p.profile = {
            themeColors: colorPair(input.profile.themeColors),
            bannerUrl: safeUrl(input.profile.bannerUrl),
            animatedAvatarUrl: safeUrl(input.profile.animatedAvatarUrl)
        };
    }

    if (isObj(input.decoration)) {
        const asset = str(input.decoration.asset, 80);
        const skuId = str(input.decoration.skuId, 25);
        if (asset && ASSET.test(asset)) p.decoration = { asset, skuId: skuId && ID.test(skuId) ? skuId : undefined };
    }

    const effect = str(input.profileEffect, 25);
    if (effect && ID.test(effect)) p.profileEffect = effect;
    const nameplate = str(input.nameplate, 25);
    if (nameplate && ID.test(nameplate)) {
        p.nameplate = nameplate;
        const data = isObj(input.nameplateData) ? input.nameplateData : undefined;
        const asset = str(data?.asset, 120);
        if (asset && /^nameplates\/[\w/-]+$/.test(asset)) {
            p.nameplateData = {
                asset,
                label: str(data?.label, 200),
                palette: str(data?.palette, 30)?.replace(/\W/g, "") || undefined
            };
        }
    }

    if (isObj(input.nameStyle)) {
        const font = str(input.nameStyle.font, 80)?.replace(/[^\w\s-]/g, "");
        const effect = str(input.nameStyle.effect, 20);
        p.nameStyle = {
            font: font || undefined,
            gradient: colorPair(input.nameStyle.gradient),
            glow: bool(input.nameStyle.glow),
            effect: effect && /^[A-Z_]+$/.test(effect) ? effect : undefined
        };
    }

    if (isObj(input.extras)) {
        p.extras = { verifiedCheck: bool(input.extras.verifiedCheck), ownerCrown: bool(input.extras.ownerCrown) };
    }

    if (isObj(input.names)) {
        p.names = {
            username: name(input.names.username),
            displayName: name(input.names.displayName),
            overrideNicknames: bool(input.names.overrideNicknames, true)
        };
    }

    if (isObj(input.servers)) {
        for (const [guildId, value] of Object.entries(input.servers)) {
            if (!SNOWFLAKE.test(guildId)) continue;
            const s = serverLarp(value);
            if (s) p.servers[guildId] = s;
        }
    }

    const l = layout(input.layout);
    if (l) p.layout = l;

    const acts = activities(input.activities);
    if (acts) p.activities = acts;

    const t = theme(input.theme);
    if (t) p.theme = t;
    const snd = sounds(input.sounds);
    if (snd) p.sounds = snd;

    p.watermark = bool(input.watermark);

    return stripUndefined(p);
}

/** Nur name und profile werden übernommen (auch kein builtin/builtinId): Importe sind immer eigene Presets */
export function sanitizePreset(input: unknown): LarpPreset | undefined {
    if (!isObj(input)) return undefined;
    const name = str(input.name, 60);
    if (!name) return undefined;
    return { name, profile: sanitizeProfile(input.profile) };
}

/** Prüft eine *.larp.json-Datei. Wirft bei ungültigem Format, verwirft einzelne kaputte Presets. */
// Texte laufen über LarpError, deshalb für den i18n-Check:
// i18n-keys: core.import.errorInvalidJson, core.import.errorNotLarpFile, core.import.errorNoPresets (LarpError)
export function parseExportFile(json: string): LarpExportFile {
    let data: unknown;
    try {
        data = JSON.parse(json);
    } catch (e) {
        throw new LarpError("core.import.errorInvalidJson");
    }
    if (!isObj(data) || data.version !== 1 || !Array.isArray(data.presets))
        throw new LarpError("core.import.errorNotLarpFile");

    const presets = data.presets.slice(0, MAX_PRESETS).map(sanitizePreset).filter(Boolean) as LarpPreset[];
    if (!presets.length) throw new LarpError("core.import.errorNoPresets");
    return { version: 1, presets };
}

function stripUndefined<T>(obj: T): T {
    if (Array.isArray(obj)) return obj.map(stripUndefined) as T;
    if (!isObj(obj)) return obj;
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj)) if (v !== undefined) out[k] = stripUndefined(v);
    return out as T;
}
