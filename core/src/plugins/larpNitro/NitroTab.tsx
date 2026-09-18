/*
 * Larpcord, a standalone Discord client for local cosmetic larping
 * Copyright (c) 2026 Larpcord contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { monthsSince } from "@plugins/larpCore/badges";
import { cl, ColorPairField, DateField, ImageField, Row, Section, Toggle } from "@plugins/larpCore/hub/components";
import { getBoostBadge, getNitroBadge } from "@plugins/larpCore/profileBadges";
import { LarpStore, useLarpProfile } from "@plugins/larpCore/store";

function BadgeInfo({ iconUrl, text }: { iconUrl?: string; text: string; }) {
    return (
        <div className={cl("inline")} style={{ marginTop: 6 }}>
            {iconUrl && <img src={iconUrl} alt="" width={22} height={22} />}
            <small className={cl("muted")}>{text}</small>
        </div>
    );
}

export function NitroTab() {
    const larp = useLarpProfile();
    const nitro = getNitroBadge(larp);
    const boost = getBoostBadge(larp);

    return (
        <>
            <Section title="Nitro" description="Nitro-Badge und -Datum in deinem Profil. Die Badge-Stufe ergibt sich aus der Abo-Dauer.">
                <Toggle label="Nitro anzeigen" value={larp.nitro.enabled} onChange={enabled => LarpStore.update({ nitro: { enabled } })} />
                {larp.nitro.enabled && (
                    <>
                        <Row label="Abonnent seit" hint={`${monthsSince(larp.nitro.since)} Monate`}>
                            <DateField value={larp.nitro.since} onCommit={since => LarpStore.update({ nitro: { since } })} />
                        </Row>
                        <Row label="Server-Boost seit" hint={larp.nitro.boostSince ? `${monthsSince(larp.nitro.boostSince)} Monate` : "leer = kein Boost-Badge"}>
                            <DateField value={larp.nitro.boostSince} onCommit={boostSince => LarpStore.update({ nitro: { boostSince } })} />
                        </Row>
                        {nitro && <BadgeInfo iconUrl={nitro.iconUrl} text={nitro.description} />}
                        {boost && <BadgeInfo iconUrl={boost.iconUrl} text={`${boost.description} (Stufe ${boost.id.replace(/\D/g, "")})`} />}
                    </>
                )}
            </Section>

            <Section title="Profil" description="Nitro-Profilanpassungen, nur auf deinem Bildschirm sichtbar.">
                <Row label="Theme-Farben" hint="Farbverlauf von Profil-Popout und -Karte">
                    <ColorPairField value={larp.profile.themeColors} onCommit={themeColors => LarpStore.update({ profile: { themeColors } })} />
                </Row>
                <Row label="Banner" hint="Bild oder GIF (https-Link oder Datei bis 1,4 MB)">
                    <ImageField value={larp.profile.bannerUrl} maxBytes={1_400_000} onCommit={bannerUrl => LarpStore.update({ profile: { bannerUrl } })} />
                </Row>
                <Row label="Animierter Avatar" hint="GIF oder Bild, ersetzt deinen Avatar überall in deinem Client">
                    <ImageField value={larp.profile.animatedAvatarUrl} maxBytes={1_400_000} onCommit={animatedAvatarUrl => LarpStore.update({ profile: { animatedAvatarUrl } })} />
                </Row>
            </Section>

            <p className={cl("muted")}>
                Echte Nitro-Funktionen (größere Uploads, HD-Streaming, Emojis überall) prüft Discords Server. Die schaltet Larpcord bewusst nicht frei.
            </p>
        </>
    );
}
