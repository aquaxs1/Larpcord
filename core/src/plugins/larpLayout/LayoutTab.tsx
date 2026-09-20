/*
 * Larpcord, a standalone Discord client for local cosmetic larping
 * Copyright (c) 2026 Larpcord contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Btn, cl, Row, Section } from "@plugins/larpCore/hub/components";
import { t, tNode, useLarpLocale } from "@plugins/larpCore/i18n";
import { useLarpProfile } from "@plugins/larpCore/store";
import { ChannelStore, showToast, Toasts, useEffect, UserStore, useState } from "@webpack/common";

import { setEditing } from "./EditMode";
import { ButtonBar, buttonName, emptyButtons, getLayoutBackup, moveDm, resetLayout, restoreLayoutBackup, setDmPinned, updateLayout } from "./layout";

function dmName(channelId: string) {
    const channel: any = ChannelStore.getChannel(channelId);
    if (!channel) return t("layout.dms.fallbackName", { id: channelId });
    if (channel.name) return channel.name;
    const names = (channel.recipients ?? []).map((id: string) => {
        const u: any = UserStore.getUser(id);
        return u?.globalName || u?.username || id;
    });
    return names.join(", ") || t("layout.dms.fallbackName", { id: channelId });
}

function HiddenButtons({ bar }: { bar: ButtonBar; }) {
    const larp = useLarpProfile();
    const layout = larp.layout?.[bar] ?? emptyButtons();
    if (!layout.hidden.length && !layout.order.length) return <p className={cl("section-desc")}>{t("layout.buttons.discordDefault")}</p>;
    return (
        <>
            {layout.hidden.map(key => (
                // Name kommt aus Discords aria-label (bei bekannten Buttons in der aktuellen Discord-Sprache)
                <Row key={key} label={buttonName(key)} hint={t("layout.buttons.hidden")}>
                    <Btn variant="secondary" onClick={() => updateLayout(l => { l[bar].hidden = l[bar].hidden.filter(k => k !== key); })}>{t("layout.buttons.show")}</Btn>
                </Row>
            ))}
            <Btn variant="secondary" style={{ marginTop: 8 }} onClick={() => updateLayout(l => { l[bar] = emptyButtons(); })}>
                {t("layout.buttons.restoreDefault")}
            </Btn>
        </>
    );
}

export function LayoutTab() {
    useLarpLocale();
    const larp = useLarpProfile();
    const { layout } = larp;
    const [hasBackup, setHasBackup] = useState(false);
    useEffect(() => void getLayoutBackup().then(b => setHasBackup(!!b)), [layout]);

    return (
        <>
            <Section
                title={t("layout.editMode.title")}
                description={tNode("layout.editMode.description", { localOnly: <strong>{t("common.localOnly")}.</strong> })}
            >
                <Row label={t("layout.edit.title")} hint={t("layout.editMode.hint")}>
                    <Btn onClick={() => setEditing(true)}>{t("layout.editMode.start")}</Btn>
                </Row>
            </Section>

            <Section title={t("layout.guilds.title")} description={t("layout.guilds.description")}>
                <Row label={layout?.guildOrder.length ? t("layout.guilds.customOrder") : t("layout.guilds.discordOrder")}>
                    {!!layout?.guildOrder.length && <Btn variant="secondary" onClick={() => updateLayout(l => { l.guildOrder = []; })}>{t("layout.guilds.useDiscordOrder")}</Btn>}
                </Row>
            </Section>

            <Section title={t("layout.dms.title")} description={t("layout.dms.description", { menu: t("layout.dmMenu.pin") })}>
                {!layout?.pinnedDms.length && <p className={cl("section-desc")}>{t("layout.dms.empty")}</p>}
                {layout?.pinnedDms.map((id, i, all) => (
                    <Row key={id} label={dmName(id)}>
                        <div className={cl("inline")}>
                            <Btn variant="secondary" disabled={i === 0} onClick={() => moveDm(id, -1)}>↑</Btn>
                            <Btn variant="secondary" disabled={i === all.length - 1} onClick={() => moveDm(id, 1)}>↓</Btn>
                            <Btn variant="danger" onClick={() => setDmPinned(id, false)}>{t("layout.dms.unpin")}</Btn>
                        </div>
                    </Row>
                ))}
            </Section>

            <Section title={t("layout.userPanel.title")}>
                <Row label={t("layout.userPanel.position")}>
                    <select
                        className={cl("input")}
                        value={layout?.userPanelPosition ?? "bottom"}
                        onChange={e => {
                            const pos = e.currentTarget.value as "top" | "bottom";
                            updateLayout(l => { l.userPanelPosition = pos; });
                        }}
                    >
                        <option value="bottom">{t("layout.userPanel.bottom")}</option>
                        <option value="top">{t("layout.userPanel.top")}</option>
                    </select>
                </Row>
                <HiddenButtons bar="userPanel" />
            </Section>

            <Section title={t("layout.channelHeader.title")}>
                <HiddenButtons bar="channelHeader" />
            </Section>

            <Section
                title={t("layout.safety.title")}
                description={t("layout.safety.description", { action: t("layout.safety.reset") })}
            >
                <div className={cl("inline")}>
                    <Btn variant="danger" disabled={!layout} onClick={async () => {
                        await resetLayout("Hub");
                        showToast(t("layout.toast.reset"), Toasts.Type.MESSAGE);
                    }}>
                        {t("layout.safety.reset")}
                    </Btn>
                    {hasBackup && (
                        <Btn variant="secondary" onClick={async () => {
                            if (await restoreLayoutBackup()) showToast(t("layout.toast.restored"), Toasts.Type.SUCCESS);
                        }}>
                            {t("layout.safety.restore")}
                        </Btn>
                    )}
                </div>
            </Section>
        </>
    );
}
