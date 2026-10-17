/*
 * Larpcord, a standalone Discord client for local cosmetic larping
 * Copyright (c) 2026 Larpcord contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { getSelfId, LarpStore, logger } from "@plugins/larpCore/store";
import { LarpActivities, LarpActivity, LarpActivityFields, LarpActivityRule, LarpActivityTimes } from "@plugins/larpCore/types";

/*
 * Umwandlung Larp-Aktivität → Discord-Aktivitätsobjekt.
 *
 * Harte Regel: Diese Objekte gehen nie ans Gateway. Sie entstehen erst beim *Lesen* der
 * Anzeige-Methoden (SelfPresenceStore.getActivities / PresenceStore.getActivities) und
 * ersetzen dort die Liste. Was Discord sendet, kommt aus getLocalPresence() und bleibt
 * unangetastet (siehe index.tsx).
 */

export interface DiscordActivity {
    id?: string;
    name: string;
    type: number;
    flags: number;
    created_at?: number;
    application_id?: string;
    details?: string;
    state?: string;
    emoji?: { name: string; };
    timestamps?: { start?: number; end?: number; };
    assets?: { large_image?: string; large_text?: string; small_image?: string; small_text?: string; };
    party?: { id?: string; size?: [number, number]; };
    buttons?: string[];
    metadata?: { button_urls?: string[]; };
    [key: string]: unknown;
}

/** Name der Spotify-Verbindung – nur so zeigt Discord die Fortschrittsleiste */
const SPOTIFY_NAME = "Spotify";

/**
 * Bildquelle eines Larp-Eintrags. Discord löst Asset-Zeichenketten mit ":" über einen
 * Präfix auf; "larp:…" fangen wir im Patch ab und geben die gespeicherte URL zurück.
 */
export const LARP_ASSET_PREFIX = "larp:";

const assetKeys = new Map<string, string>();

/** Merkt sich die URL unter einem kurzen Schlüssel und gibt den Asset-Namen zurück */
function assetFor(url: string | undefined, key: string): string | undefined {
    if (!url) return undefined;
    assetKeys.set(key, url);
    return LARP_ASSET_PREFIX + key;
}

/** Vom Patch aufgerufen: Asset-Zeichenkette → echte Bild-URL (oder undefined) */
export function resolveAsset(asset: unknown): string | undefined {
    if (typeof asset !== "string" || !asset.startsWith(LARP_ASSET_PREFIX)) return undefined;
    return assetKeys.get(asset.slice(LARP_ASSET_PREFIX.length));
}

/*
 * Feste Zeitpunkte: „live“ laufende Zeiten brauchen einen unveränderlichen Startpunkt, sonst
 * springt die Anzeige bei jedem Neu-Lesen zurück. Auch `created_at` muss stabil bleiben:
 * Discord schreibt die eigene Anzeige-Liste lokal in den Präsenz-Store zurück, und ein bei
 * jedem Aufbau neuer Wert würde daraus eine Endlosschleife machen.
 * Ein Zeitpunkt gilt, solange sich die zugehörige Einstellung nicht ändert.
 */
const stableTimes = new Map<string, { sig: string; at: number; }>();

function stableTime(key: string, signature: unknown): number {
    const sig = JSON.stringify(signature ?? null);
    const hit = stableTimes.get(key);
    if (hit?.sig === sig) return hit.at;
    const at = Date.now();
    stableTimes.set(key, { sig, at });
    return at;
}

function anchorFor(id: string, times: LarpActivityTimes): number {
    return stableTime(`anchor:${id}`, times);
}

export function clearAnchors() {
    stableTimes.clear();
}

/**
 * Kennzeichnung eigener Aktivitäten. Discord spiegelt die Anzeige-Liste lokal in den
 * Präsenz-Store zurück, deshalb müssen sie beim nächsten Aufbau wiedererkannt werden.
 * Die ID allein reicht nicht: Der benutzerdefinierte Status heißt bei Discord immer "custom".
 */
export const LARP_MARKER = "__larpcord";

/** Erkennt Aktivitäten, die Larpcord selbst erzeugt hat */
export function isLarpActivity(a: unknown): boolean {
    if (a == null || typeof a !== "object") return false;
    if ((a as Record<string, unknown>)[LARP_MARKER] === true) return true;
    const { id } = a as DiscordActivity;
    return typeof id === "string" && (id.startsWith("larp-") || id.startsWith("spotify:larp-"));
}

function applyTimes(target: DiscordActivity, id: string, times: LarpActivityTimes | undefined) {
    if (!times || times.mode === "none") return;
    const anchor = anchorFor(id, times);
    const fixed = !times.live && times.at ? new Date(times.at).getTime() : undefined;

    if (times.mode === "progress") {
        const total = Math.max(1, times.seconds ?? 0) * 1000;
        const start = anchor - (times.elapsed ?? 0) * 1000;
        target.timestamps = { start, end: start + total };
        return;
    }
    if (times.mode === "since") {
        target.timestamps = { start: fixed ?? anchor - (times.seconds ?? 0) * 1000 };
        return;
    }
    target.timestamps = { end: fixed ?? anchor + (times.seconds ?? 0) * 1000 };
}

function applyAssets(target: DiscordActivity, fields: LarpActivityFields, key: string) {
    const large = assetFor(fields.largeImage, `${key}-l`);
    const small = assetFor(fields.smallImage, `${key}-s`);
    if (!large && !small && !fields.largeText && !fields.smallText) return;
    target.assets = {
        large_image: large,
        large_text: fields.largeText,
        small_image: small,
        small_text: fields.smallText
    };
}

/** Eine eigene Larp-Aktivität in ein Discord-Aktivitätsobjekt umwandeln */
export function toDiscordActivity(a: LarpActivity): DiscordActivity {
    const out: DiscordActivity = {
        id: a.type === 4 ? "custom" : `larp-${a.id}`,
        name: a.type === 4 ? "Custom Status" : a.name,
        type: a.type,
        flags: 0,
        created_at: stableTime(`created:${a.id}`, a),
        [LARP_MARKER]: true
    };

    if (a.type === 4) {
        // Benutzerdefinierter Status: der sichtbare Text steht in `state`
        out.state = a.state || a.name;
        if (a.emoji) out.emoji = { name: a.emoji };
        return out;
    }

    if (a.details) out.details = a.details;
    if (a.state) out.state = a.state;
    if (a.party) out.party = { size: a.party };
    if (a.buttons?.length) {
        // Reine Anzeige (Regel 4): keine metadata.button_urls, also passiert beim Klick nichts
        out.buttons = a.buttons;
        out.metadata = { button_urls: [] };
    }

    applyAssets(out, a, a.id);
    applyTimes(out, a.id, a.times);

    // Fortschrittsleiste: Discord zeigt sie nur bei Aktivitäten, die es für Spotify hält
    if (a.type === 2 && a.times?.mode === "progress") {
        out.name = SPOTIFY_NAME;
        out.id = `spotify:larp-${a.id}`;
        out.party = { id: `spotify:${getSelfId() ?? "larp"}` };
        out.details ||= a.name;
    }

    return out;
}

/** Passt eine echte Aktivität an eine Regel an. Gibt null zurück, wenn sie ausgeblendet wird. */
export function applyRule(real: DiscordActivity, rule: LarpActivityRule): DiscordActivity | null {
    if (rule.hide) return null;

    const out: DiscordActivity = { ...real };
    if (rule.name) out.name = rule.name;
    if (rule.details) out.details = rule.details;
    if (rule.state) out.state = rule.state;

    if (rule.largeImage || rule.smallImage || rule.largeText || rule.smallText) {
        const assets: DiscordActivity["assets"] = { ...real.assets };
        const key = `rule-${rule.id}`;
        if (rule.largeImage) assets.large_image = assetFor(rule.largeImage, `${key}-l`);
        if (rule.smallImage) assets.small_image = assetFor(rule.smallImage, `${key}-s`);
        if (rule.largeText) assets.large_text = rule.largeText;
        if (rule.smallText) assets.small_text = rule.smallText;
        out.assets = assets;
    }

    if (rule.times) {
        if (rule.times.mode === "none") delete out.timestamps;
        else applyTimes(out, `rule-${rule.id}`, rule.times);
    }

    return out;
}

/** Schlüssel, unter dem eine echte Aktivität von Regeln gefunden wird */
export function activityMatchKeys(a: DiscordActivity): string[] {
    const keys: string[] = [];
    if (a.application_id) keys.push(String(a.application_id).toLowerCase());
    if (a.name) keys.push(String(a.name).toLowerCase());
    return keys;
}

function matchingRule(a: DiscordActivity, rules: LarpActivityRule[]) {
    const keys = activityMatchKeys(a);
    return rules.find(r => r.enabled && keys.includes(r.match));
}

/**
 * Baut die anzuzeigende Aktivitätsliste: echte Aktivitäten nach Regeln verändert,
 * danach die eigenen Larp-Aktivitäten. Gibt `real` unverändert zurück, wenn nichts zu tun ist.
 *
 * Bereits enthaltene Larp-Aktivitäten werden zuerst entfernt. Discord spiegelt die eigene
 * Anzeige-Liste lokal in den Präsenz-Store zurück, sonst würden sie sich dort vervielfachen.
 */
export function buildActivities(real: DiscordActivity[], cfg: LarpActivities | undefined): DiscordActivity[] {
    const rules = cfg?.rules.filter(r => r.enabled) ?? [];
    const own = cfg?.enabled ? cfg.list.filter(a => a.enabled) : [];

    const changed: DiscordActivity[] = [];
    let touched = false;
    for (const a of real) {
        if (isLarpActivity(a)) {
            touched = true;
            continue;
        }
        const rule = rules.length ? matchingRule(a, rules) : undefined;
        if (!rule) {
            changed.push(a);
            continue;
        }
        touched = true;
        const next = applyRule(a, rule);
        if (next) changed.push(next);
    }
    if (!touched && !own.length) return real;

    for (const a of own) {
        try {
            changed.push(toDiscordActivity(a));
        } catch (e) {
            logger.error("Aktivität konnte nicht erzeugt werden", e);
        }
    }
    return changed;
}

/** Aktuelle Einstellungen (oder undefined, wenn nichts eingerichtet ist) */
export function activityConfig(): LarpActivities | undefined {
    const cfg = LarpStore.get().activities;
    if (!cfg) return undefined;
    return cfg.list.length || cfg.rules.length ? cfg : undefined;
}
