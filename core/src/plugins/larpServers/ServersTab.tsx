/*
 * Larpcord, a standalone Discord client for local cosmetic larping
 * Copyright (c) 2026 Larpcord contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { Btn, cl, Section } from "@plugins/larpCore/hub/components";
import { t, useLarpLocale } from "@plugins/larpCore/i18n";
import { LarpStore, useLarpProfile } from "@plugins/larpCore/store";
import { ServerLarp } from "@plugins/larpCore/types";
import { GuildStore, IconUtils, useState } from "@webpack/common";

import { RolesEditor } from "./RolesEditor";

function setServer(guildId: string, patch: Partial<ServerLarp>) {
    LarpStore.update(p => {
        const merged: ServerLarp = { ...p.servers[guildId], ...patch };
        // update() mergt tief: undefined löscht ein Feld, ein komplett leerer Eintrag wird entfernt
        const entry = {
            partner: merged.partner || undefined,
            verified: merged.verified || undefined,
            boostLevel: merged.boostLevel,
            boostCount: merged.boostCount,
            roles: merged.roles?.length ? merged.roles : undefined
        };
        const empty = Object.values(entry).every(v => v === undefined);
        return { servers: { [guildId]: empty ? undefined : entry } };
    });
}

function ServerRow({ guild, larp }: { guild: any; larp: ServerLarp | undefined; }) {
    const icon = guild.icon ? IconUtils.getGuildIconURL({ id: guild.id, icon: guild.icon, size: 64, canAnimate: false }) : null;
    const s = larp ?? {};
    const [open, setOpen] = useState(false);
    const roleCount = s.roles?.length ?? 0;

    return (
        <div className={cl("server", larp && "server-active")}>
            <div className={cl("server-name")}>
                {icon ? <img src={icon} alt="" /> : <span className={cl("server-acronym")}>{guild.acronym ?? guild.name.slice(0, 2)}</span>}
                <span title={guild.name}>{guild.name}</span>
            </div>
            <div className={cl("server-controls")}>
                <label className={cl("check")}>
                    <input type="checkbox" checked={!!s.partner} onChange={e => setServer(guild.id, { partner: e.currentTarget.checked })} />
                    {t("servers.partner")}
                </label>
                <label className={cl("check")}>
                    <input type="checkbox" checked={!!s.verified} onChange={e => setServer(guild.id, { verified: e.currentTarget.checked })} />
                    {t("servers.verified")}
                </label>
                <select
                    className={cl("input", "input-small")}
                    value={s.boostLevel ?? ""}
                    title={t("servers.boostLevel")}
                    onChange={e => setServer(guild.id, { boostLevel: e.currentTarget.value === "" ? undefined : Number(e.currentTarget.value) as ServerLarp["boostLevel"] })}
                >
                    <option value="">{t("servers.boostLevelReal")}</option>
                    {[0, 1, 2, 3].map(l => <option key={l} value={l}>{t("servers.boostLevelOption", { level: l })}</option>)}
                </select>
                <input
                    className={cl("input", "input-small")}
                    type="number"
                    min={0}
                    max={999999}
                    placeholder={t("servers.boostCountPlaceholder")}
                    title={t("servers.boostCount")}
                    value={s.boostCount ?? ""}
                    onChange={e => {
                        const v = e.currentTarget.value;
                        setServer(guild.id, { boostCount: v === "" ? undefined : Math.max(0, Math.min(999_999, Math.floor(Number(v)))) });
                    }}
                />
                <Btn variant="secondary" onClick={() => setOpen(!open)}>
                    {roleCount ? t("roles.buttonCount", { count: roleCount }) : t("roles.button")}
                </Btn>
                {larp && <Btn variant="danger" title={t("common.reset")} aria-label={t("common.reset")} onClick={() => setServer(guild.id, { partner: undefined, verified: undefined, boostLevel: undefined, boostCount: undefined, roles: undefined })}>✕</Btn>}
            </div>
            {open && <RolesEditor guildId={guild.id} roles={s.roles ?? []} />}
        </div>
    );
}

export function ServersTab() {
    const larp = useLarpProfile();
    useLarpLocale();
    const [query, setQuery] = useState("");
    const guilds = Object.values(GuildStore.getGuilds()) as any[];
    const q = query.trim().toLowerCase();
    const filtered = guilds
        .filter(g => !q || g.name.toLowerCase().includes(q))
        .sort((a, b) => Number(!!larp.servers[b.id]) - Number(!!larp.servers[a.id]) || a.name.localeCompare(b.name));

    return (
        <Section title={t("servers.title")} description={t("servers.description")}>
            <input className={cl("input")} placeholder={t("servers.search", { count: guilds.length })} value={query} onChange={e => setQuery(e.currentTarget.value)} style={{ marginBottom: 12 }} />
            <div className={cl("server-list")}>
                {filtered.map(g => <ServerRow key={g.id} guild={g} larp={larp.servers[g.id]} />)}
            </div>
        </Section>
    );
}
