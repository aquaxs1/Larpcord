/*
 * Larpcord, a standalone Discord client for local cosmetic larping
 * Copyright (c) 2026 Larpcord contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import ErrorBoundary from "@components/ErrorBoundary";
import { Btn } from "@plugins/larpCore/hub/components";
import { errorText, t, useLarpLocale } from "@plugins/larpCore/i18n";
import { LARPCORD_LOGO } from "@plugins/larpCore/logo";
import { LarpStore, logger, useLarpProfile } from "@plugins/larpCore/store";
import { ChannelStore, createRoot, FluxDispatcher, GuildStore, SelectedChannelStore, showToast, Toasts, useEffect, useReducer, UserStore, useState } from "@webpack/common";
import type { Root } from "react-dom/client";

import {
    ButtonBar, buttonName, containerSelector, cssString, getLabels, getLayout, guildKey, isProtected, matchLabels,
    orderGuildRoots, resetLayout, SortedGuildStore, stableKey, updateLayout
} from "./layout";

/*
 * Bearbeitungsmodus (Strg+Shift+L oder Hub):
 * - Rahmen und Griffe liegen in einem eigenen Overlay, Discords DOM wird nicht verändert.
 * - Klicks auf Discord werden in der Capture-Phase abgefangen (auch Discords natives Drag & Drop).
 * - Verschieben per eigenem Drag & Drop. Gespeichert wird nur im Larpcord-Store.
 */

type ListId = "guilds" | "dms" | ButtonBar;

interface Item {
    list: ListId;
    key: string;
    el: HTMLElement;
    rect: DOMRect;
    name: string;
    labels?: string[];
    pinned?: boolean;
    hidden?: boolean;
    protected?: boolean;
}

interface Drag {
    item: Item;
    startX: number;
    startY: number;
    x: number;
    y: number;
    active: boolean;
}

// ---- Zustand ----

let editing = false;
let drag: Drag | null = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach(fn => fn());

export const isEditing = () => editing;

export function useEditing() {
    const [, force] = useReducer(x => x + 1, 0);
    useEffect(() => (listeners.add(force), () => void listeners.delete(force)), []);
    return editing;
}

export function setEditing(on: boolean) {
    if (on === editing) return;
    editing = on;
    drag = null;
    document.documentElement.classList.toggle("larp-layout-editing", on);
    if (on) {
        // Einstellungen o. Ä. schließen, damit die App sichtbar ist (rein lokale UI-Aktion)
        try {
            FluxDispatcher.dispatch({ type: "LAYER_POP_ALL" });
        } catch { }
        addBlockers();
        mountOverlay();
    } else {
        removeBlockers();
        unmountOverlay();
    }
    notify();
}

export const toggleEditing = () => setEditing(!editing);

// ---- Elemente finden (nur über IDs und aria-labels) ----

function visible(el: Element | null): el is HTMLElement {
    if (!(el instanceof HTMLElement)) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < innerHeight;
}

function guildRoots(): any[] {
    try {
        return orderGuildRoots(SortedGuildStore.getGuildsTree().getRoots());
    } catch {
        return [];
    }
}

function guildItems(): Item[] {
    const items: Item[] = [];
    for (const node of guildRoots()) {
        const el = document.querySelector(`[data-list-item-id="guildsnav___${node.id}"]`);
        if (!visible(el)) continue;
        const name = node.type === "folder"
            ? (node.name || t("layout.edit.folderFallback"))
            : GuildStore.getGuild(String(node.id))?.name ?? t("layout.edit.serverFallback");
        items.push({ list: "guilds", key: guildKey(node), el, rect: el.getBoundingClientRect(), name });
    }
    return items;
}

const DM_LINK = 'a[href^="/channels/@me/"][data-list-item-id^="private-channels-"]';

function dmItems(): Item[] {
    const { privateChannels } = getLabels();
    const root = privateChannels ? document.querySelector(`nav[aria-label=${cssString(privateChannels)}]`) : null;
    if (!root) return [];
    const pinned = new Set(getLayout().pinnedDms);
    const items: Item[] = [];
    for (const a of root.querySelectorAll<HTMLAnchorElement>(DM_LINK)) {
        const key = a.getAttribute("href")!.split("/").pop()!;
        const el = (a.closest("li") ?? a) as HTMLElement;
        if (!/^\d+$/.test(key) || !visible(el)) continue;
        // aria-label ist Discords eigener Text (bereits in Discords Sprache)
        items.push({ list: "dms", key, el, rect: el.getBoundingClientRect(), name: a.getAttribute("aria-label") ?? t("layout.edit.dmFallback"), pinned: pinned.has(key) });
    }
    return items;
}

/**
 * Namen des aktuellen Kanals, Servers und der DM-Partner. Labels wie "<Name> suchen" hängen davon ab
 * und wären weder stabil noch sollen sie (als Namen Dritter) in Presets oder Exporten landen.
 */
function channelSpecificNames(): string[] {
    try {
        const channel: any = ChannelStore.getChannel(SelectedChannelStore.getChannelId());
        if (!channel) return [];
        const names = [channel.name, GuildStore.getGuild(channel.guild_id)?.name];
        for (const id of channel.recipients ?? []) {
            const u: any = UserStore.getUser(id);
            names.push(u?.username, u?.globalName);
        }
        return names.filter((n): n is string => typeof n === "string" && n.length >= 2);
    } catch {
        return [];
    }
}

function labelsOf(el: Element) {
    const set = new Set<string>();
    const own = el.getAttribute("aria-label");
    if (own) set.add(own);
    for (const e of el.querySelectorAll("[aria-label]")) set.add(e.getAttribute("aria-label")!);
    const dynamic = channelSpecificNames();
    return [...set]
        .filter(l => l && !dynamic.some(n => l.includes(n)))
        // kürzestes Label zuerst: meist der allgemeine Name ("Suche" statt "<Name> suchen")
        .sort((a, b) => a.length - b.length)
        .slice(0, 10);
}

function barItems(bar: ButtonBar): Item[] {
    const sel = containerSelector(bar);
    const container = sel ? document.querySelector(sel) : null;
    if (!container) return [];
    const layout = getLayout()[bar];
    const known = [...new Set([...layout.order, ...layout.hidden])];
    const items: Item[] = [];
    for (const el of container.children) {
        if (!visible(el)) continue;
        const labels = labelsOf(el);
        if (!labels.length) continue;
        // Gespeicherte Schlüssel zuerst (auch alte, sprachabhängige), sonst stabile ID bzw. aria-label
        const key = known.find(k => matchLabels(k, layout).some(l => labels.includes(l))) ?? stableKey(labels);
        items.push({
            list: bar, key, el, rect: el.getBoundingClientRect(), name: buttonName(key), labels,
            hidden: layout.hidden.includes(key), protected: isProtected(bar, labels)
        });
    }
    return items;
}

function itemsOf(list: ListId): Item[] {
    try {
        if (list === "guilds") return guildItems();
        if (list === "dms") return dmItems();
        return barItems(list);
    } catch (e) {
        logger.error("Layout: Elemente konnten nicht gelesen werden", e);
        return [];
    }
}

const ALL_LISTS: ListId[] = ["guilds", "dms", "userPanel", "channelHeader"];

function findItemAt(target: Element): Item | undefined {
    for (const list of ALL_LISTS) {
        const items = itemsOf(list);
        if (list === "guilds") {
            // Server in einem Ordner: der Ordner wird als Ganzes verschoben
            const g = target.closest('[data-list-item-id^="guildsnav___"]');
            if (!g) continue;
            const id = g.getAttribute("data-list-item-id")!.slice("guildsnav___".length);
            const root = guildRoots().find(n => String(n.id) === id || n.children?.some((c: any) => String(c.id) === id));
            const item = root && items.find(i => i.key === guildKey(root));
            if (item) return item;
            continue;
        }
        const hit = items.find(i => i.el.contains(target));
        if (hit) return hit;
    }
}

// ---- Drop ----

const isHorizontal = (list: ListId) => list === "userPanel" || list === "channelHeader";

function othersSorted(d: Drag, items: Item[]) {
    const h = isHorizontal(d.item.list);
    return items.filter(i => i.key !== d.item.key).sort((a, b) => h ? a.rect.left - b.rect.left : a.rect.top - b.rect.top);
}

function dropIndex(d: Drag, others: Item[]) {
    const h = isHorizontal(d.item.list);
    const p = h ? d.x : d.y;
    let idx = 0;
    for (const it of others) if (p > (h ? it.rect.left + it.rect.width / 2 : it.rect.top + it.rect.height / 2)) idx++;
    return idx;
}

function commitDrop(d: Drag) {
    const items = itemsOf(d.item.list);
    const others = othersSorted(d, items);
    const idx = dropIndex(d, others);
    const { key } = d.item;

    if (d.item.list === "guilds") {
        // Volle Liste (auch nicht sichtbare Einträge), Einfügeposition über den Nachbarn bestimmen
        const rest = guildRoots().map(guildKey).filter(k => k !== key);
        const anchor = others[idx]?.key;
        let pos = anchor ? rest.indexOf(anchor) : others.length ? rest.indexOf(others[others.length - 1].key) + 1 : rest.length;
        if (pos < 0) pos = rest.length;
        rest.splice(pos, 0, key);
        updateLayout(l => { l.guildOrder = rest; });
        return;
    }

    if (d.item.list === "dms") {
        // Oben in den angepinnten Block ziehen = anpinnen, darunter ablegen = lösen
        const pinned = getLayout().pinnedDms.filter(id => id !== key);
        const pinnedVisible = others.filter(o => pinned.includes(o.key));
        if (idx <= pinnedVisible.length) {
            const anchor = others[idx];
            const pos = anchor && pinned.includes(anchor.key)
                ? pinned.indexOf(anchor.key)
                : pinnedVisible.length ? pinned.indexOf(pinnedVisible[pinnedVisible.length - 1].key) + 1 : 0;
            pinned.splice(pos, 0, key);
        }
        updateLayout(l => { l.pinnedDms = pinned; });
        return;
    }

    const bar = d.item.list;
    const keys = others.map(o => o.key);
    keys.splice(idx, 0, key);
    updateLayout(l => {
        l[bar].order = keys;
        for (const it of items) if (it.labels) l[bar].labels[it.key] = it.labels;
    });
}

function toggleHidden(item: Item) {
    if (item.protected || !isHorizontal(item.list)) return;
    const bar = item.list as ButtonBar;
    updateLayout(l => {
        const b = l[bar];
        if (item.labels) b.labels[item.key] = item.labels;
        b.hidden = b.hidden.includes(item.key) ? b.hidden.filter(k => k !== item.key) : [...b.hidden, item.key];
    });
}

// ---- Eingaben abfangen ----

const inOwnUi = (t: EventTarget | null) => t instanceof Element && !!t.closest("#larp-layout-ui");

function block(e: Event) {
    if (inOwnUi(e.target)) return true;
    e.preventDefault();
    e.stopImmediatePropagation();
    return false;
}

function onPointerDown(e: PointerEvent) {
    if (block(e) || e.button !== 0) return;
    const item = findItemAt(e.target as Element);
    if (!item) return;
    drag = { item, startX: e.clientX, startY: e.clientY, x: e.clientX, y: e.clientY, active: false };
    notify();
}

function onPointerMove(e: PointerEvent) {
    if (!drag) return;
    drag.x = e.clientX;
    drag.y = e.clientY;
    if (!drag.active && Math.hypot(drag.x - drag.startX, drag.y - drag.startY) > 5) drag.active = true;
    notify();
}

function onPointerUp(e: PointerEvent) {
    if (!drag) return;
    block(e);
    const d = drag;
    drag = null;
    if (d.active) {
        try {
            commitDrop(d);
        } catch (err) {
            logger.error("Layout: Verschieben fehlgeschlagen", err);
        }
    }
    notify();
}

function onKeyDown(e: KeyboardEvent) {
    if (e.key === "Escape" && !inOwnUi(e.target)) {
        e.preventDefault();
        e.stopImmediatePropagation();
        setEditing(false);
    }
}

const BLOCKED = ["mousedown", "mouseup", "click", "dblclick", "auxclick", "contextmenu", "dragstart", "drop"] as const;

function addBlockers() {
    for (const type of BLOCKED) window.addEventListener(type, block, true);
    window.addEventListener("pointerdown", onPointerDown, true);
    window.addEventListener("pointermove", onPointerMove, true);
    window.addEventListener("pointerup", onPointerUp, true);
    window.addEventListener("keydown", onKeyDown, true);
}

function removeBlockers() {
    for (const type of BLOCKED) window.removeEventListener(type, block, true);
    window.removeEventListener("pointerdown", onPointerDown, true);
    window.removeEventListener("pointermove", onPointerMove, true);
    window.removeEventListener("pointerup", onPointerUp, true);
    window.removeEventListener("keydown", onKeyDown, true);
}

// ---- Overlay ----

function Frame({ item, dragging }: { item: Item; dragging: boolean; }) {
    const r = item.rect;
    const cls = ["larp-layout-frame", item.pinned && "larp-layout-frame-pinned", item.hidden && "larp-layout-frame-hidden", dragging && "larp-layout-frame-dragging"];
    return (
        <div
            className={cls.filter(Boolean).join(" ")}
            data-larp-key={`${item.list}:${item.key}`}
            style={{ left: r.left - 2, top: r.top - 2, width: r.width + 4, height: r.height + 4 }}
        >
            {item.pinned && <span className="larp-layout-pin" title={t("layout.edit.pinned")}>📌</span>}
            {isHorizontal(item.list) && !item.protected && (
                <button
                    className="larp-layout-eye"
                    title={item.hidden ? t("layout.buttons.show") : t("layout.buttons.hide")}
                    onClick={() => toggleHidden(item)}
                >
                    {item.hidden ? "🚫" : "👁"}
                </button>
            )}
        </div>
    );
}

function Indicator({ d }: { d: Drag; }) {
    const others = othersSorted(d, itemsOf(d.item.list));
    if (!others.length) return null;
    const idx = dropIndex(d, others);
    const h = isHorizontal(d.item.list);
    const ref = others[Math.min(idx, others.length - 1)].rect;
    const before = idx < others.length;
    const style = h
        ? { left: (before ? ref.left : ref.right) - 2, top: ref.top - 4, width: 4, height: ref.height + 8 }
        : { left: ref.left - 4, top: (before ? ref.top : ref.bottom) - 2, width: ref.width + 8, height: 4 };
    return <div className="larp-layout-indicator" style={style} />;
}

function Toolbar() {
    const larp = useLarpProfile();
    const [presetName, setPresetName] = useState<string | null>(null);
    const top = larp.layout?.userPanelPosition === "top";

    const savePreset = () => {
        try {
            LarpStore.savePreset(presetName ?? "");
            showToast(t("layout.edit.presetSaved", { name: presetName!.trim() }), Toasts.Type.SUCCESS);
            setPresetName(null);
        } catch (e) {
            showToast(errorText(e), Toasts.Type.FAILURE);
        }
    };

    return (
        <div className="larp-layout-bar">
            <strong><img className="larp-edit-logo" src={LARPCORD_LOGO} alt="" draggable={false} /> {t("layout.edit.title")}</strong>
            <span className="larp-layout-hint">{t("layout.edit.hint")}</span>
            <Btn variant="secondary" onClick={() => updateLayout(l => { l.userPanelPosition = top ? "bottom" : "top"; })}>
                {top ? t("layout.edit.panelDown") : t("layout.edit.panelUp")}
            </Btn>
            <Btn variant="danger" onClick={async () => {
                await resetLayout("Bearbeitungsmodus");
                showToast(t("layout.toast.resetEditMode"), Toasts.Type.MESSAGE);
            }}>
                {t("common.reset")}
            </Btn>
            {presetName == null
                ? <Btn variant="secondary" onClick={() => setPresetName("")}>{t("layout.edit.saveAsPreset")}</Btn>
                : (
                    <span className="larp-layout-preset">
                        <input
                            autoFocus
                            className="larp-input"
                            placeholder={t("layout.edit.presetName")}
                            value={presetName}
                            maxLength={60}
                            onChange={e => setPresetName(e.currentTarget.value)}
                            onKeyDown={e => {
                                if (e.key === "Enter") savePreset();
                                if (e.key === "Escape") setPresetName(null);
                                e.stopPropagation();
                            }}
                        />
                        <Btn onClick={savePreset}>{t("common.save")}</Btn>
                    </span>
                )}
            <Btn onClick={() => setEditing(false)}>{t("common.done")}</Btn>
        </div>
    );
}

function Overlay() {
    // Eigenes React-Root außerhalb des Hubs: bei Sprachwechsel selbst neu rendern
    useLarpLocale();
    const [, force] = useReducer(x => x + 1, 0);
    useEffect(() => {
        listeners.add(force);
        // Positionen regelmäßig neu messen (Scrollen, Größenänderungen, Discord-Rerender)
        const t = setInterval(force, 200);
        return () => {
            listeners.delete(force);
            clearInterval(t);
        };
    }, []);

    const items = ALL_LISTS.flatMap(itemsOf);
    const d = drag;
    return (
        <>
            {items.map(item => <Frame key={`${item.list}:${item.key}`} item={item} dragging={!!d?.active && d.item.list === item.list && d.item.key === item.key} />)}
            {d?.active && <Indicator d={d} />}
            {d?.active && <div className="larp-layout-ghost" style={{ left: d.x + 12, top: d.y + 12 }}>{d.item.name}</div>}
            <Toolbar />
        </>
    );
}

const SafeOverlay = ErrorBoundary.wrap(Overlay, { onError: () => setEditing(false) });

let host: HTMLDivElement | undefined;
let root: Root | undefined;

function mountOverlay() {
    host = document.createElement("div");
    host.id = "larp-layout-ui";
    document.body.appendChild(host);
    root = createRoot(host);
    root.render(<SafeOverlay />);
}

function unmountOverlay() {
    root?.unmount();
    host?.remove();
    root = host = undefined;
}
