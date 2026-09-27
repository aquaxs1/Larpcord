/*
 * Larpcord, a standalone Discord client for local cosmetic larping
 * Copyright (c) 2026 Larpcord contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Btn, cl, Row, Section, TextField, Toggle } from "@plugins/larpCore/hub/components";
import { t, useLarpLocale } from "@plugins/larpCore/i18n";
import { LarpStore, useLarpProfile } from "@plugins/larpCore/store";
import { LarpConnection, LarpConnections } from "@plugins/larpCore/types";
import { useState } from "@webpack/common";

import { CONNECTION_PLATFORMS, platformOf } from "./platforms";

const EMPTY: LarpConnections = { list: [], hideReal: false };
const MAX = 20;

function newId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function update(fn: (c: LarpConnections) => LarpConnections) {
    LarpStore.update(p => ({ connections: fn(p.connections ?? EMPTY) }));
}

function patchConnection(id: string, patch: Partial<LarpConnection>) {
    update(c => ({ ...c, list: c.list.map(x => x.id === id ? { ...x, ...patch } : x) }));
}

function PlatformSelect({ value, onChange }: { value: string; onChange(type: string): void; }) {
    return (
        <select className={cl("input", "input-medium")} value={value} onChange={e => onChange(e.currentTarget.value)}>
            {CONNECTION_PLATFORMS.map(p => <option key={p.type} value={p.type}>{p.label}</option>)}
        </select>
    );
}

export function PlatformChip({ type }: { type: string; }) {
    const p = platformOf(type);
    return <span className={cl("conn-chip")} style={{ background: p.color }}>{p.label}</span>;
}

function Editor({ c }: { c: LarpConnection; }) {
    return (
        <div className={cl("conn-editor")}>
            <Row label={t("connections.platform")}>
                <PlatformSelect value={c.type} onChange={type => patchConnection(c.id, { type })} />
            </Row>
            <Row label={t("connections.name")}>
                {/* An empty name would drop the entry (validation), so keep the old one */}
                <TextField value={c.name} maxLength={64} onCommit={name => name && patchConnection(c.id, { name })} />
            </Row>
            <Row label={t("connections.accountId")} hint={t("connections.accountIdHint")}>
                <TextField value={c.accountId} maxLength={64} placeholder={c.name} onCommit={accountId => patchConnection(c.id, { accountId })} />
            </Row>
            <Toggle label={t("connections.verified")} value={c.verified} onChange={verified => patchConnection(c.id, { verified })} />
        </div>
    );
}

export function ConnectionsTab() {
    useLarpLocale();
    const larp = useLarpProfile();
    const cfg = larp.connections ?? EMPTY;
    const [open, setOpen] = useState<string>();
    const [type, setType] = useState(CONNECTION_PLATFORMS[0].type);

    const add = () => {
        const id = newId();
        update(c => ({ ...c, list: [...c.list, { id, enabled: true, type, name: platformOf(type).label, verified: true }] }));
        setOpen(id);
    };

    return (
        <Section
            title={t("connections.title")}
            description={t("connections.description")}
        >
            <Toggle
                label={t("connections.hideReal")}
                hint={t("connections.hideRealHint")}
                value={cfg.hideReal}
                onChange={hideReal => update(c => ({ ...c, hideReal }))}
            />

            {!cfg.list.length && <p className={cl("muted")}>{t("connections.empty")}</p>}
            <div className={cl("conn-list")}>
                {cfg.list.map(c => (
                    <div key={c.id} className={cl("conn-item", c.enabled && "conn-item-on")}>
                        <div className={cl("conn-head")}>
                            <label className={cl("check")}>
                                <input type="checkbox" checked={c.enabled} onChange={e => patchConnection(c.id, { enabled: e.currentTarget.checked })} />
                                <span className={cl("conn-title")}>{c.name}{c.verified ? " ✔" : ""}</span>
                            </label>
                            <PlatformChip type={c.type} />
                            <Btn variant="secondary" onClick={() => setOpen(open === c.id ? undefined : c.id)}>
                                {open === c.id ? t("common.done") : t("common.edit")}
                            </Btn>
                            <Btn
                                variant="danger"
                                title={t("common.delete")}
                                aria-label={t("common.delete")}
                                onClick={() => update(x => ({ ...x, list: x.list.filter(y => y.id !== c.id) }))}
                            >
                                ✕
                            </Btn>
                        </div>
                        {open === c.id && <Editor c={c} />}
                    </div>
                ))}
            </div>

            <div className={cl("inline")} style={{ marginTop: 8 }}>
                <PlatformSelect value={type} onChange={setType} />
                <Btn onClick={add} disabled={cfg.list.length >= MAX}>{t("connections.add")}</Btn>
            </div>
        </Section>
    );
}
