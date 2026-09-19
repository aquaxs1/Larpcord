/*
 * Larpcord, a standalone Discord client for local cosmetic larping
 * Copyright (c) 2026 Larpcord contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Btn, cl, Row, Section } from "@plugins/larpCore/hub/components";
import { useLarpProfile } from "@plugins/larpCore/store";
import { ChannelStore, showToast, Toasts, useEffect, UserStore, useState } from "@webpack/common";

import { setEditing } from "./EditMode";
import { ButtonBar, emptyButtons, getLayoutBackup, moveDm, resetLayout, restoreLayoutBackup, setDmPinned, updateLayout } from "./layout";

function dmName(channelId: string) {
    const channel: any = ChannelStore.getChannel(channelId);
    if (!channel) return `DM ${channelId}`;
    if (channel.name) return channel.name;
    const names = (channel.recipients ?? []).map((id: string) => {
        const u: any = UserStore.getUser(id);
        return u?.globalName || u?.username || id;
    });
    return names.join(", ") || `DM ${channelId}`;
}

function HiddenButtons({ bar }: { bar: ButtonBar; }) {
    const larp = useLarpProfile();
    const layout = larp.layout?.[bar] ?? emptyButtons();
    if (!layout.hidden.length && !layout.order.length) return <p className={cl("section-desc")}>Discords Standard.</p>;
    return (
        <>
            {layout.hidden.map(key => (
                <Row key={key} label={key} hint="Ausgeblendet">
                    <Btn variant="secondary" onClick={() => updateLayout(l => { l[bar].hidden = l[bar].hidden.filter(k => k !== key); })}>Einblenden</Btn>
                </Row>
            ))}
            <Btn variant="secondary" style={{ marginTop: 8 }} onClick={() => updateLayout(l => { l[bar] = emptyButtons(); })}>
                Standard wiederherstellen
            </Btn>
        </>
    );
}

export function LayoutTab() {
    const larp = useLarpProfile();
    const { layout } = larp;
    const [hasBackup, setHasBackup] = useState(false);
    useEffect(() => void getLayoutBackup().then(b => setHasBackup(!!b)), [layout]);

    return (
        <>
            <Section
                title="Bearbeitungsmodus"
                description={<><strong>Nur lokal sichtbar.</strong> Discords echte Server-Reihenfolge und deine Account-Einstellungen bleiben unverändert.</>}
            >
                <Row label="Layout bearbeiten" hint="Tastenkürzel: Strg+Shift+L. Server, Ordner, DMs und Buttons ziehen, 👁 blendet Buttons aus.">
                    <Btn onClick={() => setEditing(true)}>Bearbeiten starten</Btn>
                </Row>
            </Section>

            <Section title="Serverleiste" description="Neue Server erscheinen automatisch am Ende. Ordner werden als Ganzes verschoben.">
                <Row label={layout?.guildOrder.length ? "Eigene Reihenfolge aktiv" : "Discords Reihenfolge"}>
                    {!!layout?.guildOrder.length && <Btn variant="secondary" onClick={() => updateLayout(l => { l.guildOrder = []; })}>Discords Reihenfolge verwenden</Btn>}
                </Row>
            </Section>

            <Section title="Angepinnte DMs" description="Rechtsklick auf eine DM → „In Larpcord anpinnen“. Angepinnte DMs stehen oben in fester Reihenfolge.">
                {!layout?.pinnedDms.length && <p className={cl("section-desc")}>Keine DMs angepinnt.</p>}
                {layout?.pinnedDms.map((id, i, all) => (
                    <Row key={id} label={dmName(id)}>
                        <div className={cl("inline")}>
                            <Btn variant="secondary" disabled={i === 0} onClick={() => moveDm(id, -1)}>↑</Btn>
                            <Btn variant="secondary" disabled={i === all.length - 1} onClick={() => moveDm(id, 1)}>↓</Btn>
                            <Btn variant="danger" onClick={() => setDmPinned(id, false)}>Lösen</Btn>
                        </div>
                    </Row>
                ))}
            </Section>

            <Section title="User-Panel">
                <Row label="Position">
                    <select
                        className={cl("input")}
                        value={layout?.userPanelPosition ?? "bottom"}
                        onChange={e => {
                            const pos = e.currentTarget.value as "top" | "bottom";
                            updateLayout(l => { l.userPanelPosition = pos; });
                        }}
                    >
                        <option value="bottom">Unten (Standard)</option>
                        <option value="top">Oben</option>
                    </select>
                </Row>
                <HiddenButtons bar="userPanel" />
            </Section>

            <Section title="Kanal-Header">
                <HiddenButtons bar="channelHeader" />
            </Section>

            <Section
                title="Sicherheitsnetz"
                description="Falls etwas nicht mehr erreichbar ist: Shift beim Start von Larpcord gedrückt halten oder im Tray-Menü „Layout zurücksetzen“ wählen."
            >
                <div className={cl("inline")}>
                    <Btn variant="danger" disabled={!layout} onClick={async () => {
                        await resetLayout("Hub");
                        showToast("Layout zurückgesetzt", Toasts.Type.MESSAGE);
                    }}>
                        Layout zurücksetzen
                    </Btn>
                    {hasBackup && (
                        <Btn variant="secondary" onClick={async () => {
                            if (await restoreLayoutBackup()) showToast("Letztes Layout wiederhergestellt", Toasts.Type.SUCCESS);
                        }}>
                            Letztes Layout wiederherstellen
                        </Btn>
                    )}
                </div>
            </Section>
        </>
    );
}
