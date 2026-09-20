/*
 * Larpcord, a standalone Discord client for local cosmetic larping
 * Copyright (c) 2026 Larpcord contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import * as DataStore from "@api/DataStore";
import { getIntlLocale } from "@plugins/larpCore/i18n";
import { LarpStore, logger } from "@plugins/larpCore/store";
import { LarpButtonLayout, LarpLayout } from "@plugins/larpCore/types";
import { runtimeHashMessageKey } from "@utils/intlHash";
import { findStoreLazy } from "@webpack";
import { i18n } from "@webpack/common";

/*
 * Layout-Logik ohne UI. Grundsätze:
 * - Discords eigene (synchronisierte) Reihenfolge wird nie verändert (Regel 5). Larpcord sortiert
 *   nur beim Rendern um und blendet per CSS aus.
 * - Elemente werden über stabile IDs erkannt: Guild-/Folder-IDs (data-list-item-id), Channel-IDs
 *   (href) und aria-labels. Container-Labels kommen aus Discords Übersetzungen, damit das Layout
 *   in jeder Sprache greift. Nie über Positionen oder minifizierte Klassen.
 * - Buttons mit bekanntem Discord-Übersetzungsschlüssel werden unter einer sprachunabhängigen ID
 *   ("intl:<SCHLÜSSEL>") gespeichert, alle anderen unter ihrem aria-label (sprachabhängig).
 * - Sprachwechsel: index.tsx ruft invalidateLabels() auf und erzeugt das CSS neu.
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

/**
 * Discord-Text zu einem gehashten Übersetzungsschlüssel in der aktuellen Discord-Sprache.
 * Wie getIntlMessageFromHash aus @utils/discord, aber ohne Fehler-Log: unbekannte Schlüssel
 * (z. B. nach einem Discord-Update) ergeben einfach undefined.
 */
function intlHash(hash: string) {
    try {
        const message = i18n.t[hash];
        if (message == null) return undefined;
        const s = i18n.intl.string(message);
        return typeof s === "string" && s && s !== hash ? s : undefined;
    } catch {
        return undefined;
    }
}

function intl(key: string) {
    try {
        const s = intlHash(runtimeHashMessageKey(key));
        return s !== key ? s : undefined;
    } catch {
        return undefined;
    }
}

/*
 * Caches gelten pro Discord-Sprache und Generation. Discord lädt die Texte einer neuen Sprache
 * asynchron nach, deshalb verwirft index.tsx die Caches nach einem Sprachwechsel mehrmals.
 */
let generation = 0;

function cacheToken() {
    return `${getIntlLocale()}#${generation}`;
}

/** Nach einem Sprachwechsel aufrufen: Labels werden beim nächsten Zugriff neu gelesen */
export function invalidateLabels() {
    generation++;
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

let labelCache: { token: string; labels: Labels; } | undefined;
let lastMissing = "";

export function getLabels(): Labels {
    const token = cacheToken();
    if (labelCache?.token === token) return labelCache.labels;
    const labels: Labels = {
        panel: intlHash("vTl6Lk"),
        settings: intl("USER_SETTINGS"),
        header: intl("CHANNEL_HEADER_BAR_A11Y_LABEL"),
        guildSidebar: intlHash("PjnF2t"),
        privateChannels: intl("PRIVATE_CHANNELS_A11Y_LABEL")
    };
    const missing = Object.entries(labels).filter(([, v]) => !v).map(([k]) => k);
    if (missing.join() !== lastMissing && missing.length) logger.warn("Layout: Labels nicht gefunden, zugehörige Bereiche sind deaktiviert:", missing);
    lastMissing = missing.join();
    labelCache = { token, labels };
    return labels;
}

// ---- Buttons sprachunabhängig erkennen ----

/** Präfix für Button-Schlüssel, die auf einen Discord-Übersetzungsschlüssel zeigen */
const INTL_KEY = "intl:";
/** Einstellungen-Button (nie ausblendbar) */
const SETTINGS_KEY = INTL_KEY + "USER_SETTINGS";

/**
 * Buttons, deren aria-label aus einem bekannten Discord-Übersetzungsschlüssel stammt. Eine Gruppe ist
 * ein Button, Umschalter wechseln ihr Label (z. B. Stummschalten/Stummschaltung aufheben).
 * Gespeichert wird "intl:<erster Schlüssel>", in jeder Sprache wird daraus der aktuelle Text.
 * Unbekannte Schlüssel (z. B. nach einem Discord-Update) schaden nicht: Der Button wird dann wie
 * bisher über sein aria-label erkannt.
 */
const KNOWN_BUTTONS = [
    // User-Panel
    ["MUTE", "UNMUTE"],
    ["DEAFEN", "UNDEAFEN"],
    ["USER_SETTINGS"],
    // Kanal-Header
    ["THREADS"],
    ["NOTIFICATION_SETTINGS"],
    ["PINNED_MESSAGES"],
    ["SHOW_MEMBER_LIST", "HIDE_MEMBER_LIST", "MEMBER_LIST"],
    ["SHOW_USER_PROFILE", "HIDE_USER_PROFILE"],
    ["START_VOICE_CALL"],
    ["START_VIDEO_CALL"],
    ["ADD_FRIENDS_TO_DM"],
    ["SEARCH"],
    ["INBOX"],
    ["HELP"]
];

interface KnownIndex {
    /** aktueller Text → stabile ID */
    byText: Map<string, string>;
    /** stabile ID → alle aktuellen Texte */
    texts: Map<string, string[]>;
}

let knownCache: { token: string; index: KnownIndex; } | undefined;

function knownIndex(): KnownIndex {
    const token = cacheToken();
    if (knownCache?.token === token) return knownCache.index;
    const index: KnownIndex = { byText: new Map(), texts: new Map() };
    for (const group of KNOWN_BUTTONS) {
        const id = INTL_KEY + group[0];
        const texts = [...new Set(group.map(intl).filter(Boolean) as string[])];
        index.texts.set(id, texts);
        for (const t of texts) if (!index.byText.has(t)) index.byText.set(t, id);
    }
    knownCache = { token, index };
    return index;
}

/** Alle aktuellen Texte zu einem Label oder einer stabilen ID (Umschalter liefern beide Zustände) */
function aliasesOf(label: string): string[] {
    const { byText, texts } = knownIndex();
    if (label.startsWith(INTL_KEY)) return texts.get(label) ?? [];
    const id = byText.get(label);
    return id ? [label, ...(texts.get(id) ?? [])] : [label];
}

/** Stabile ID für ein aria-label, sonst das Label selbst */
export function canonicalKey(label: string) {
    return knownIndex().byText.get(label) ?? label;
}

/** Schlüssel für einen Button mit diesen aria-labels: bekannte Discord-Texte zuerst, sonst das erste Label */
export function stableKey(labels: string[]) {
    const { byText } = knownIndex();
    for (const l of labels) {
        const id = byText.get(l);
        if (id) return id;
    }
    return canonicalKey(labels[0]);
}

/** Anzeigename eines gespeicherten Buttons in der aktuellen Discord-Sprache */
export function buttonName(key: string) {
    if (!key.startsWith(INTL_KEY)) return key;
    return knownIndex().texts.get(key)?.[0] ?? key.slice(INTL_KEY.length);
}

/** Alle Labels, an denen ein gespeicherter Button erkannt wird */
export function matchLabels(key: string, bar: LarpButtonLayout): string[] {
    const out = new Set<string>();
    for (const l of [key, ...(bar.labels[key] ?? [])]) for (const a of aliasesOf(l)) out.add(a);
    return [...out];
}

/**
 * Ältere Layouts speichern Buttons unter ihrem aria-label, also in der Sprache beim Speichern.
 * Bekannte Buttons werden auf stabile IDs umgestellt. Das klappt nur, solange Discord in derselben
 * Sprache läuft, daher wird es bei jedem Anwenden des Layouts erneut versucht (idempotent).
 */
function migrateBar(bar: LarpButtonLayout): LarpButtonLayout | undefined {
    const { byText } = knownIndex();
    const rename = new Map<string, string>();
    for (const key of new Set([...bar.order, ...bar.hidden, ...Object.keys(bar.labels)])) {
        if (key.startsWith(INTL_KEY)) continue;
        const id = [key, ...(bar.labels[key] ?? [])].map(l => byText.get(l)).find(Boolean);
        if (id) rename.set(key, id);
    }
    if (!rename.size) return undefined;

    const r = (k: string) => rename.get(k) ?? k;
    const labels: Record<string, string[]> = {};
    for (const [k, list] of Object.entries(bar.labels)) {
        const nk = r(k);
        labels[nk] = [...new Set([...(labels[nk] ?? []), ...list])].slice(0, 10);
    }
    return { order: [...new Set(bar.order.map(r))], hidden: [...new Set(bar.hidden.map(r))], labels };
}

/** Stellt alte Button-Schlüssel im gespeicherten Layout um. Gibt true zurück, wenn gespeichert wurde. */
export function migrateStoredLayout(): boolean {
    const profile = LarpStore.get();
    const { layout } = profile;
    if (!layout) return false;
    const userPanel = migrateBar(layout.userPanel);
    const channelHeader = migrateBar(layout.channelHeader);
    if (!userPanel && !channelHeader) return false;
    LarpStore.replace({
        ...profile,
        layout: { ...layout, userPanel: userPanel ?? layout.userPanel, channelHeader: channelHeader ?? layout.channelHeader }
    }, LarpStore.activePreset);
    logger.info("Layout: Button-Schlüssel auf sprachunabhängige IDs umgestellt");
    return true;
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
        layout.order.forEach((key, i) => {
            const labels = matchLabels(key, layout);
            // Stabile ID ohne Text in der aktuellen Sprache: nichts erzeugen (leeres :is() wäre ungültig)
            if (labels.length) css.push(`${container} > ${itemSelector(labels)} { order: ${i}; }`);
        });
    }
    for (const key of layout.hidden) {
        const labels = matchLabels(key, layout);
        if (!labels.length || key === SETTINGS_KEY || isProtected(bar, labels)) continue;
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
