/*
 * Larpcord, a standalone Discord client for local cosmetic larping
 * Copyright (c) 2026 Larpcord contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Btn, cl, Row, Section, Toggle } from "@plugins/larpCore/hub/components";
import { errorText, t, useLarpLocale } from "@plugins/larpCore/i18n";
import { LarpStore, MAX_ACCOUNTS, presetKey, useLarpProfile } from "@plugins/larpCore/store";
import { showToast, Toasts, useState } from "@webpack/common";

import { AccountRow } from "./AccountRow";
import { accountView, allAccountViews, switchLarpAccount } from "./accounts";

function AddAccount() {
    const [from, setFrom] = useState("empty");
    const presets = LarpStore.getPresets();

    const add = () => {
        try {
            const source = from === "empty" ? { kind: "empty" as const }
                : from === "current" ? { kind: "current" as const }
                    : { kind: "preset" as const, key: from };
            LarpStore.createAccount(source);
        } catch (e) {
            showToast(errorText(e), Toasts.Type.FAILURE);
        }
    };

    return (
        <Row label={t("accounts.add")} hint={t("accounts.addHint")}>
            <div className={cl("inline")}>
                <select className={cl("input", "input-medium")} value={from} onChange={e => setFrom(e.currentTarget.value)}>
                    <option value="empty">{t("accounts.fromEmpty")}</option>
                    {!LarpStore.isRealProfile && <option value="current">{t("accounts.fromCurrent")}</option>}
                    {presets.map(p => <option key={presetKey(p)} value={presetKey(p)}>{t("accounts.fromPreset", { name: p.name })}</option>)}
                </select>
                <Btn onClick={add} disabled={LarpStore.getAccounts().length >= MAX_ACCOUNTS}>{t("common.add")}</Btn>
            </div>
        </Row>
    );
}

export function AccountsTab() {
    useLarpLocale();
    useLarpProfile();
    const [confirmDelete, setConfirmDelete] = useState<string>();
    const views = allAccountViews();
    const real = accountView(undefined);

    return (
        <>
            <Section title={t("accounts.title")} description={t("accounts.description")}>
                <div className="larp-account-list">
                    <div className={real.active ? "larp-account-item larp-account-item-active" : "larp-account-item"}>
                        <AccountRow view={{ ...real, username: t("accounts.realHint") }} />
                        {real.active
                            ? <span className="larp-account-badge">{t("accounts.active")}</span>
                            : <Btn variant="secondary" onClick={() => switchLarpAccount(undefined)}>{t("accounts.switch")}</Btn>}
                    </div>

                    {views.map((v, i) => (
                        <div key={v.id} className={v.active ? "larp-account-item larp-account-item-active" : "larp-account-item"}>
                            <AccountRow view={v} />
                            {v.active
                                ? <span className="larp-account-badge">{t("accounts.active")}</span>
                                : <Btn variant="secondary" onClick={() => switchLarpAccount(v.id)}>{t("accounts.switch")}</Btn>}
                            <Btn variant="secondary" title={t("accounts.moveUp")} aria-label={t("accounts.moveUp")} disabled={i === 0} onClick={() => LarpStore.moveAccount(v.id!, -1)}>↑</Btn>
                            <Btn variant="secondary" title={t("accounts.moveDown")} aria-label={t("accounts.moveDown")} disabled={i === views.length - 1} onClick={() => LarpStore.moveAccount(v.id!, 1)}>↓</Btn>
                            <Btn
                                variant="danger"
                                onClick={() => {
                                    if (confirmDelete !== v.id) return setConfirmDelete(v.id);
                                    setConfirmDelete(undefined);
                                    LarpStore.deleteAccount(v.id!);
                                }}
                            >
                                {confirmDelete === v.id ? t("accounts.confirmDelete") : t("common.delete")}
                            </Btn>
                        </div>
                    ))}
                </div>
            </Section>

            <Section title={t("accounts.manageTitle")}>
                <AddAccount />
                <Toggle
                    label={t("accounts.animation")}
                    hint={t("accounts.animationHint")}
                    value={LarpStore.switchAnimation}
                    onChange={v => LarpStore.setSwitchAnimation(v)}
                />
            </Section>
        </>
    );
}
