/*
 * Larpcord, a standalone Discord client for local cosmetic larping
 * Copyright (c) 2026 Larpcord contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { Btn, cl, Section } from "@plugins/larpCore/hub/components";
import { LarpStore, useLarpProfile } from "@plugins/larpCore/store";
import { ServerLarp } from "@plugins/larpCore/types";
import { GuildStore, IconUtils, useState } from "@webpack/common";

function setServer(guildId: string, patch: Partial<ServerLarp>) {
    LarpStore.update(p => {
        const merged: ServerLarp = { ...p.servers[guildId], ...patch };
        // update() mergt tief: undefined löscht ein Feld, ein komplett leerer Eintrag wird entfernt
        const entry = {
            partner: merged.partner || undefined,
            verified: merged.verified || undefined,
            boostLevel: merged.boostLevel,
            boostCount: merged.boostCount
        };
        const empty = Object.values(entry).every(v => v === undefined);
        return { servers: { [guildId]: empty ? undefined : entry } };
    });
}

function ServerRow({ guild, larp }: { guild: any; larp: ServerLarp | undefined; }) {
    const icon = guild.icon ? IconUtils.getGuildIconURL({ id: guild.id, icon: guild.icon, size: 64, canAnimate: false }) : null;
    const s = larp ?? {};

    return (
        <div className={cl("server", larp && "server-active")}>
            <div className={cl("server-name")}>
                {icon ? <img src={icon} alt="" /> : <span className={cl("server-acronym")}>{guild.acronym ?? guild.name.slice(0, 2)}</span>}
                <span title={guild.name}>{guild.name}</span>
            </div>
            <div className={cl("server-controls")}>
                <label className={cl("check")}>
                    <input type="checkbox" checked={!!s.partner} onChange={e => setServer(guild.id, { partner: e.currentTarget.checked })} />
                    Partner
                </label>
                <label className={cl("check")}>
                    <input type="checkbox" checked={!!s.verified} onChange={e => setServer(guild.id, { verified: e.currentTarget.checked })} />
                    Verifiziert
                </label>
                <select
                    className={cl("input", "input-small")}
                    value={s.boostLevel ?? ""}
                    title="Boost-Stufe"
                    onChange={e => setServer(guild.id, { boostLevel: e.currentTarget.value === "" ? undefined : Number(e.currentTarget.value) as ServerLarp["boostLevel"] })}
                >
                    <option value="">Stufe: echt</option>
                    {[0, 1, 2, 3].map(l => <option key={l} value={l}>Stufe {l}</option>)}
                </select>
                <input
                    className={cl("input", "input-small")}
                    type="number"
                    min={0}
                    max={999999}
                    placeholder="Boosts"
                    title="Anzahl Boosts"
                    value={s.boostCount ?? ""}
                    onChange={e => {
                        const v = e.currentTarget.value;
                        setServer(guild.id, { boostCount: v === "" ? undefined : Math.max(0, Math.min(999_999, Math.floor(Number(v)))) });
                    }}
                />
                {larp && <Btn variant="danger" title="Zurücksetzen" onClick={() => setServer(guild.id, { partner: undefined, verified: undefined, boostLevel: undefined, boostCount: undefined })}>✕</Btn>}
            </div>
        </div>
    );
}

export function ServersTab() {
    const larp = useLarpProfile();
    const [query, setQuery] = useState("");
    const guilds = Object.values(GuildStore.getGuilds()) as any[];
    const q = query.trim().toLowerCase();
    const filtered = guilds
        .filter(g => !q || g.name.toLowerCase().includes(q))
        .sort((a, b) => Number(!!larp.servers[b.id]) - Number(!!larp.servers[a.id]) || a.name.localeCompare(b.name));

    return (
        <Section title="Server" description="Abzeichen und Boost-Anzeige pro Server. Nur Anzeige: Funktionen des Servers ändern sich nicht.">
            <input className={cl("input")} placeholder={`${guilds.length} Server durchsuchen …`} value={query} onChange={e => setQuery(e.currentTarget.value)} style={{ marginBottom: 12 }} />
            <div className={cl("server-list")}>
                {filtered.map(g => <ServerRow key={g.id} guild={g} larp={larp.servers[g.id]} />)}
            </div>
        </Section>
    );
}
