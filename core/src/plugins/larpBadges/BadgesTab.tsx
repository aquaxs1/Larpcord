/*
 * Larpcord, a standalone Discord client for local cosmetic larping
 * Copyright (c) 2026 Larpcord contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { badgeIconUrl, OFFICIAL_BADGES } from "@plugins/larpCore/badges";
import { Btn, cl, DateField, ImageField, Section } from "@plugins/larpCore/hub/components";
import { getLarpBadges } from "@plugins/larpCore/profileBadges";
import { LarpStore, useLarpProfile } from "@plugins/larpCore/store";
import { useState } from "@webpack/common";

function OfficialBadges() {
    const larp = useLarpProfile();
    const active = new Set(larp.badges.builtin);

    // funktionales Update: liest den aktuellen Store-Stand, nicht den (evtl. veralteten) Render-Stand
    const toggle = (id: string) => LarpStore.update(p => ({
        badges: { builtin: p.badges.builtin.includes(id) ? p.badges.builtin.filter(b => b !== id) : [...p.badges.builtin, id] }
    }));

    return (
        <Section title="Offizielle Badges" description="Anklicken zum Ein- und Ausschalten. Die Icons kommen direkt von Discord.">
            <div className={cl("badge-grid")}>
                {OFFICIAL_BADGES.map(b => (
                    <button
                        key={b.id}
                        className={cl("badge-tile", active.has(b.id) && "badge-tile-on")}
                        aria-pressed={active.has(b.id)}
                        title={b.description}
                        onClick={() => toggle(b.id)}
                    >
                        <img src={badgeIconUrl(b.icon)} alt="" />
                        <span>{b.description}{b.id === "bug_hunter_level_2" ? " (Gold)" : ""}</span>
                    </button>
                ))}
            </div>
            <div className={cl("inline")} style={{ marginTop: 8 }}>
                <Btn variant="secondary" onClick={() => LarpStore.update({ badges: { builtin: OFFICIAL_BADGES.map(b => b.id) } })}>Alle</Btn>
                <Btn variant="secondary" onClick={() => LarpStore.update({ badges: { builtin: [] } })}>Keine</Btn>
            </div>
        </Section>
    );
}

function CustomBadges() {
    const larp = useLarpProfile();
    const [image, setImage] = useState<string>();
    const [tooltip, setTooltip] = useState("");

    const add = () => {
        if (!image || !tooltip.trim()) return;
        const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
        LarpStore.update(p => ({ badges: { custom: [...p.badges.custom, { id, imageUrl: image, tooltip: tooltip.trim() }] } }));
        setImage(undefined);
        setTooltip("");
    };

    const remove = (id: string) => LarpStore.update(p => ({
        badges: { custom: p.badges.custom.filter(c => c.id !== id) },
        badgeOrder: p.badgeOrder?.filter(k => k !== `custom:${id}`)
    }));

    return (
        <Section title="Eigene Badges" description="Eigenes Bild (PNG, GIF, SVG, WebP) per https-Link oder als Datei, dazu ein Tooltip-Text.">
            {larp.badges.custom.length > 0 && (
                <div className={cl("custom-list")}>
                    {larp.badges.custom.map(c => (
                        <div key={c.id} className={cl("custom-item")}>
                            <img src={c.imageUrl} alt="" />
                            <span>{c.tooltip}</span>
                            <Btn variant="danger" onClick={() => remove(c.id)}>Entfernen</Btn>
                        </div>
                    ))}
                </div>
            )}
            <div className={cl("custom-add")}>
                {image && <img className={cl("custom-preview")} src={image} alt="" />}
                <ImageField value={image} onCommit={setImage} maxBytes={512_000} />
                <input
                    className={cl("input")}
                    placeholder="Tooltip, z. B. „Bester Freund“"
                    value={tooltip}
                    maxLength={100}
                    onChange={e => setTooltip(e.currentTarget.value)}
                    onKeyDown={e => e.key === "Enter" && add()}
                />
                <Btn disabled={!image || !tooltip.trim()} onClick={add}>Hinzufügen</Btn>
            </div>
        </Section>
    );
}

function BadgeOrder() {
    const larp = useLarpProfile();
    const badges = getLarpBadges(larp);
    const [dragKey, setDragKey] = useState<string>();

    if (badges.length < 2) return null;

    const move = (from: string, to: string) => {
        if (from === to) return;
        const keys = badges.map(b => b.key);
        const movingDown = keys.indexOf(from) < keys.indexOf(to);
        keys.splice(keys.indexOf(from), 1);
        // nach unten gezogen → hinter das Ziel, nach oben gezogen → davor
        keys.splice(keys.indexOf(to) + (movingDown ? 1 : 0), 0, from);
        LarpStore.update({ badgeOrder: keys });
    };

    return (
        <Section title="Reihenfolge" description="Per Drag & Drop sortieren. So erscheinen die Badges in deinem Profil.">
            <div className={cl("order-list")}>
                {badges.map(b => (
                    <div
                        key={b.key}
                        draggable
                        className={cl("order-item", dragKey === b.key && "order-dragging")}
                        onDragStart={e => { setDragKey(b.key); e.dataTransfer.effectAllowed = "move"; }}
                        onDragEnd={() => setDragKey(undefined)}
                        onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; }}
                        onDrop={e => { e.preventDefault(); if (dragKey) move(dragKey, b.key); setDragKey(undefined); }}
                        title={b.description}
                    >
                        <img src={b.iconUrl} alt="" />
                    </div>
                ))}
            </div>
            {larp.badgeOrder && <Btn variant="secondary" style={{ marginTop: 8 }} onClick={() => LarpStore.update({ badgeOrder: undefined })}>Standard-Reihenfolge</Btn>}
        </Section>
    );
}

export function BadgesTab() {
    const larp = useLarpProfile();
    return (
        <>
            <OfficialBadges />
            <CustomBadges />
            <BadgeOrder />
            <Section title="Mitglied seit" description="Überschreibt das „Mitglied seit“-Datum in deinem Profil. Leer = echtes Datum.">
                <DateField value={larp.memberSince} onCommit={memberSince => LarpStore.update({ memberSince })} />
            </Section>
        </>
    );
}
