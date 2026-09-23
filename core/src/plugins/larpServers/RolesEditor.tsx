/*
 * Larpcord, a standalone Discord client for local cosmetic larping
 * Copyright (c) 2026 Larpcord contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Btn, cl, ColorField, ImageField, TextField } from "@plugins/larpCore/hub/components";
import { t } from "@plugins/larpCore/i18n";
import { LarpStore } from "@plugins/larpCore/store";
import { LarpRole } from "@plugins/larpCore/types";

import { ROLE_TEMPLATES } from "./roles";

/*
 * Rollen-Editor eines Servers. Die Reihenfolge im Array ist die Rangfolge, der erste
 * Eintrag ist die höchste Rolle (und bestimmt damit die Namensfarbe).
 */

const MAX_ROLES = 20;

function setRoles(guildId: string, fn: (roles: LarpRole[]) => LarpRole[]) {
    LarpStore.update(p => {
        const roles = fn(p.servers[guildId]?.roles ?? []);
        return { servers: { [guildId]: { roles: roles.length ? roles : undefined } } };
    });
}

function newRole(name: string, color: string): LarpRole {
    return {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        name,
        color,
        assigned: true
    };
}

/** Farbvorschau: einfarbig oder Verlauf */
function RoleSwatch({ role }: { role: LarpRole; }) {
    const background = role.gradient ? `linear-gradient(90deg, ${role.color}, ${role.gradient})` : role.color;
    return <span className={cl("role-swatch")} style={{ background }} />;
}

function RoleRow({ guildId, role, index, count }: { guildId: string; role: LarpRole; index: number; count: number; }) {
    const patch = (p: Partial<LarpRole>) => setRoles(guildId, roles => roles.map(r => r.id === role.id ? { ...r, ...p } : r));
    const move = (delta: number) => setRoles(guildId, roles => {
        const next = [...roles];
        const to = index + delta;
        if (to < 0 || to >= next.length) return roles;
        [next[index], next[to]] = [next[to], next[index]];
        return next;
    });

    return (
        <div className={cl("role")}>
            <div className={cl("role-main")}>
                <label className={cl("check")} title={t("roles.assigned")}>
                    <input type="checkbox" checked={role.assigned} onChange={e => patch({ assigned: e.currentTarget.checked })} />
                </label>
                <RoleSwatch role={role} />
                <TextField value={role.name} maxLength={100} onCommit={name => name && patch({ name })} />
            </div>
            <div className={cl("role-controls")}>
                <ColorField value={role.color} onChange={color => patch({ color })} />
                {role.gradient
                    ? (
                        <>
                            <ColorField value={role.gradient} onChange={gradient => patch({ gradient })} />
                            <Btn variant="secondary" title={t("roles.gradientOff")} aria-label={t("roles.gradientOff")} onClick={() => patch({ gradient: undefined })}>–</Btn>
                        </>
                    )
                    : <Btn variant="secondary" onClick={() => patch({ gradient: role.color })}>{t("roles.gradientOn")}</Btn>}
                <Btn variant="secondary" disabled={index === 0} title={t("roles.up")} aria-label={t("roles.up")} onClick={() => move(-1)}>↑</Btn>
                <Btn variant="secondary" disabled={index === count - 1} title={t("roles.down")} aria-label={t("roles.down")} onClick={() => move(1)}>↓</Btn>
                <Btn variant="danger" title={t("common.delete")} aria-label={t("common.delete")} onClick={() => setRoles(guildId, roles => roles.filter(r => r.id !== role.id))}>✕</Btn>
            </div>
            <div className={cl("role-icon-field")}>
                <small className={cl("muted")}>{t("roles.icon")}</small>
                <ImageField value={role.iconUrl} maxBytes={200_000} onCommit={iconUrl => patch({ iconUrl })} />
            </div>
        </div>
    );
}

export function RolesEditor({ guildId, roles }: { guildId: string; roles: LarpRole[]; }) {
    const full = roles.length >= MAX_ROLES;

    return (
        <div className={cl("roles")}>
            <p className={cl("muted")}>{t("roles.description")}</p>

            {roles.map((role, index) => (
                <RoleRow key={role.id} guildId={guildId} role={role} index={index} count={roles.length} />
            ))}

            <div className={cl("inline")}>
                <Btn disabled={full} onClick={() => setRoles(guildId, r => [...r, newRole(t("roles.newName"), "#99aab5")])}>
                    {t("roles.add")}
                </Btn>
                {ROLE_TEMPLATES.map(({ key, color }) => (
                    <Btn
                        key={key}
                        variant="secondary"
                        disabled={full}
                        // i18n-keys: roles.template.* (owner, admin, moderator, vip)
                        onClick={() => setRoles(guildId, r => [...r, newRole(t(`roles.template.${key}`), color)])}
                    >
                        + {t(`roles.template.${key}`)}
                    </Btn>
                ))}
            </div>
        </div>
    );
}
