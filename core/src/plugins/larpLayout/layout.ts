/*
 * Larpcord, a standalone Discord client for local cosmetic larping
 * Copyright (c) 2026 Larpcord contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import * as DataStore from "@api/DataStore";
import { LarpStore, logger } from "@plugins/larpCore/store";
import { LarpButtonLayout, LarpLayout } from "@plugins/larpCore/types";
import { getIntlMessage, getIntlMessageFromHash } from "@utils/discord";
import { findStoreLazy } from "@webpack";

/*
 * Layout-Logik ohne UI. Grundsätze:
 * - Discords eigene (synchronisierte) Reihenfolge wird nie verändert (Regel 5). Larpcord sortiert
 *   nur beim Rendern um und blendet per CSS aus.
 * - Elemente werden über stabile IDs erkannt: Guild-/Folder-IDs (data-list-item-id), Channel-IDs
 *   (href) und aria-labels. Container-Labels kommen aus Discords Übersetzungen, damit das Layout
 *   in jeder Sprache greift. Nie über Positionen oder minifizierte Klassen.
 */

export const SortedGuildStore = findStoreLazy("SortedGuildStore");
export const PrivateChannelSortStore = findStoreLazy("PrivateChannelSortStore");

export type ButtonBar = "userPanel" | "channelHeader";

export const emptyButtons = (): LarpButtonLayout => ({ order: [], hidden: [], labels: {} });

export function createDefaultLayout(): LarpLayout {
    return { guildOrder: [], pinnedDms: [], userPanel: emptyButtons(), channelHeader: emptyButtons(), userPanelPosition: "bottom" };
}

export function getLayout(): LarpLayout {
    return LarpStore.get().layout ?? createDefaultLayout();
}

export function hasLayout() {
    return LarpStore.get().layout != null;
}

/** Ändert eine Kopie des Layouts und speichert sie */
export function updateLayout(fn: (layout: LarpLayout) => void) {
    const next = structuredClone(getLayout());
    fn(next);
    // Ganzes Layout in einem Schritt ersetzen (update() würde verschachtelte Objekte wie labels nur mergen)
    LarpStore.replace({ ...LarpStore.get(), layout: next });
}

// ---- Zurücksetzen mit Sicherung ----

const BACKUP_KEY = "Larpcord_layout_backup";

export async function resetLayout(reason: string) {
    const current = LarpStore.get().layout;
    if (current) await DataStore.set(BACKUP_KEY, current).catch(e => logger.error("Layout-Sicherung fehlgeschlagen", e));
    LarpStore.update({ layout: undefined });
    logger.info(`Layout zurückgesetzt (${reason})`);
}

export async function getLayoutBackup(): Promise<LarpLayout | undefined> {
    return DataStore.get<LarpLayout>(BACKUP_KEY).catch(() => undefined);
}

export async function restoreLayoutBackup() {
    const backup = await getLayoutBackup();
    if (!backup) return false;
    LarpStore.replace({ ...LarpStore.get(), layout: backup });
    return true;
}

// ---- Übersetzte Labels (Discords eigene Texte, dadurch sprachunabhängig) ----

function intl(key: string) {
    try {
        const s = getIntlMessage(key);
        return typeof s === "string" && s && s !== key ? s : undefined;
    } catch {
        return undefined;
    }
}

function intlHash(hash: string) {
    try {
        const s = getIntlMessageFromHash(hash);
        return typeof s === "string" && s && s !== hash ? s : undefined;
    } catch {
        return undefined;
    }
}

export interface Labels {
    /** section des User-Panels ("Benutzerstatus und Einstellungen") */
    panel?: string;
    /** Einstellungen-Button im User-Panel */
    settings?: string;
    /** section des Kanal-Headers */
    header?: string;
    /** nav der Serverleiste */
    guildSidebar?: string;
    /** nav der DM-Liste */
    privateChannels?: string;
}

let labelCache: { locale: string; labels: Labels; } | undefined;

export function getLabels(): Labels {
    const locale = document.documentElement.lang || "";
    if (labelCache?.locale === locale) return labelCache.labels;
    const labels: Labels = {
        panel: intlHash("vTl6Lk"),
        settings: intl("USER_SETTINGS"),
        header: intl("CHANNEL_HEADER_BAR_A11Y_LABEL"),
        guildSidebar: intlHash("PjnF2t"),
        privateChannels: intl("PRIVATE_CHANNELS_A11Y_LABEL")
    };
    const missing = Object.entries(labels).filter(([, v]) => !v).map(([k]) => k);
    if (missing.length) logger.warn("Layout: Labels nicht gefunden, zugehörige Bereiche sind deaktiviert:", missing);
    labelCache = { locale, labels };
    return labels;
}

/** Umschalter wechseln ihr aria-label je nach Zustand. Diese Paare gelten als derselbe Button. */
const TOGGLE_PAIRS = [["MUTE", "UNMUTE"], ["DEAFEN", "UNDEAFEN"], ["SHOW_USER_PROFILE", "HIDE_USER_PROFILE"]];

let aliasCache: { locale: string; map: Map<string, string[]>; } | undefined;

function aliasesOf(label: string): string[] {
    const locale = document.documentElement.lang || "";
    if (aliasCache?.locale !== locale) {
        const map = new Map<string, string[]>();
        for (const pair of TOGGLE_PAIRS) {
            const texts = pair.map(intl).filter(Boolean) as string[];
            for (const t of texts) map.set(t, texts);
        }
        aliasCache = { locale, map };
    }
    return aliasCache.map.get(label) ?? [label];
}

/** Kanonischer Schlüssel: bei Umschaltern immer das erste Label des Paars */
export function canonicalKey(label: string) {
    return aliasesOf(label)[0];
}

/** Alle Labels, an denen ein gespeicherter Button erkannt wird */
export function matchLabels(key: string, bar: LarpButtonLayout): string[] {
    const out = new Set<string>();
    for (const l of [key, ...(bar.labels[key] ?? [])]) for (const a of aliasesOf(l)) out.add(a);
    return [...out];
}

// ---- Selektoren ----

/** String für einen CSS-Attributselektor in doppelten Anführungszeichen */
export function cssString(s: string) {
    return `"${s.replace(/["\\]/g, "\\$&").replace(/[\n\r\f]/g, " ")}"`;
}

export function containerSelector(bar: ButtonBar): string | undefined {
    const L = getLabels();
    if (bar === "userPanel")
        return L.panel && L.settings ? `section[aria-label=${cssString(L.panel)}] :has(> [aria-label=${cssString(L.settings)}])` : undefined;
    // HeaderBar: section > div > [Titelbereich, Toolbar]
    return L.header ? `section[aria-label=${cssString(L.header)}] > div > div:nth-child(2)` : undefined;
}

export function itemSelector(labels: string[]) {
    return `:is(${labels.map(l => `[aria-label=${cssString(l)}], :has([aria-label=${cssString(l)}])`).join(", ")})`;
}

/** Der Einstellungen-Button darf nie ausgeblendet werden */
export function isProtected(bar: ButtonBar, labels: string[]) {
    const { settings } = getLabels();
    return bar === "userPanel" && !!settings && labels.includes(settings);
}

// ---- Sortierung beim Rendern ----

interface TreeNode { type?: string; id?: string | number; }

export function guildKey(node: TreeNode) {
    return node?.type === "folder" ? `folder:${node.id}` : String(node?.id);
}

/** Wendet die eigene Reihenfolge auf die oberste Ebene der Serverleiste an. Neue Einträge landen am Ende. */
export function orderGuildRoots<T extends TreeNode>(roots: T[]): T[] {
    try {
        const order = LarpStore.get().layout?.guildOrder;
        if (!order?.length || !Array.isArray(roots)) return roots;
        const index = new Map(order.map((k, i) => [k, i]));
        const known: T[] = [], unknown: T[] = [];
        for (const node of roots) (index.has(guildKey(node)) ? known : unknown).push(node);
        known.sort((a, b) => index.get(guildKey(a))! - index.get(guildKey(b))!);
        return known.concat(unknown);
    } catch (e) {
        logger.error("orderGuildRoots", e);
        return roots;
    }
}

/** Angepinnte DMs oben in fester Reihenfolge, der Rest in Discords Reihenfolge */
export function orderDmIds(ids: string[]): string[] {
    try {
        const pinned = LarpStore.get().layout?.pinnedDms;
        if (!pinned?.length || !Array.isArray(ids)) return ids;
        const present = new Set(ids);
        const top = pinned.filter(id => present.has(id));
        if (!top.length) return ids;
        const topSet = new Set(top);
        return top.concat(ids.filter(id => !topSet.has(id)));
    } catch (e) {
        logger.error("orderDmIds", e);
        return ids;
    }
}

export function isDmPinned(channelId: string) {
    return LarpStore.get().layout?.pinnedDms.includes(channelId) ?? false;
}

export function setDmPinned(channelId: string, pinned: boolean) {
    updateLayout(l => {
        l.pinnedDms = l.pinnedDms.filter(id => id !== channelId);
        if (pinned) l.pinnedDms.push(channelId);
    });
}

export function moveDm(channelId: string, delta: number) {
    updateLayout(l => {
        const i = l.pinnedDms.indexOf(channelId);
        const j = i + delta;
        if (i < 0 || j < 0 || j >= l.pinnedDms.length) return;
        [l.pinnedDms[i], l.pinnedDms[j]] = [l.pinnedDms[j], l.pinnedDms[i]];
    });
}

// ---- CSS ----

function barCss(bar: ButtonBar, layout: LarpButtonLayout): string[] {
    const container = containerSelector(bar);
    if (!container || (!layout.order.length && !layout.hidden.length)) return [];
    const css: string[] = [];
    if (layout.order.length) {
        // Unbekannte (z. B. neue) Buttons ans Ende
        css.push(`${container} > * { order: 1000; }`);
        layout.order.forEach((key, i) => css.push(`${container} > ${itemSelector(matchLabels(key, layout))} { order: ${i}; }`));
    }
    for (const key of layout.hidden) {
        const labels = matchLabels(key, layout);
        if (isProtected(bar, labels)) continue;
        const sel = `${container} > ${itemSelector(labels)}`;
        css.push(`html:not(.larp-layout-editing) ${sel} { display: none !important; }`);
        css.push(`html.larp-layout-editing ${sel} { opacity: 0.35; }`);
    }
    return css;
}

function panelTopCss(): string[] {
    const { panel, guildSidebar } = getLabels();
    if (!panel || !guildSidebar) return [];
    const nav = `nav[aria-label=${cssString(guildSidebar)}]`;
    // Discord reserviert unten Platz über --custom-app-panels-height (auf <body>).
    // Für "oben" wird diese Reserve in den Listen neutralisiert und oben eingefügt.
    return [
        "body { --larp-panel-h: var(--custom-app-panels-height, 58px); }",
        `section[aria-label=${cssString(panel)}] { top: 8px !important; bottom: auto !important; }`,
        `${nav}, ${nav} + div { --custom-app-panels-height: 8px !important; }`,
        `${nav} { margin-top: calc(var(--larp-panel-h) + 8px) !important; }`,
        `${nav} + div { padding-top: calc(var(--larp-panel-h) + 8px) !important; box-sizing: border-box; }`
    ];
}

export function buildLayoutCss(layout: LarpLayout | undefined): string {
    if (!layout) return "";
    try {
        return [
            "/* Larpcord-Layout (automatisch erzeugt) */",
            ...barCss("userPanel", layout.userPanel),
            ...barCss("channelHeader", layout.channelHeader),
            ...(layout.userPanelPosition === "top" ? panelTopCss() : [])
        ].join("\n");
    } catch (e) {
        logger.error("Layout-CSS konnte nicht erzeugt werden", e);
        return "";
    }
}
