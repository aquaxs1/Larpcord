/*
 * Larpcord, a standalone Discord client for local cosmetic larping
 * Copyright (c) 2026 Larpcord contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { monthsSince } from "@plugins/larpCore/badges";
import { cl, ColorPairField, DateField, ImageField, Row, Section, Toggle } from "@plugins/larpCore/hub/components";
import { t, useLarpLocale } from "@plugins/larpCore/i18n";
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
    useLarpLocale();
    const larp = useLarpProfile();
    const nitro = getNitroBadge(larp);
    const boost = getBoostBadge(larp);

    return (
        <>
            <Section title="Nitro" description={t("nitro.section.description")}>
                <Toggle label={t("nitro.show")} value={larp.nitro.enabled} onChange={enabled => LarpStore.update({ nitro: { enabled } })} />
                {larp.nitro.enabled && (
                    <>
                        <Row label={t("nitro.since.label")} hint={t("nitro.months", { count: monthsSince(larp.nitro.since) })}>
                            <DateField value={larp.nitro.since} onCommit={since => LarpStore.update({ nitro: { since } })} />
                        </Row>
                        <Row label={t("nitro.boostSince.label")} hint={larp.nitro.boostSince ? t("nitro.months", { count: monthsSince(larp.nitro.boostSince) }) : t("nitro.boostSince.emptyHint")}>
                            <DateField value={larp.nitro.boostSince} onCommit={boostSince => LarpStore.update({ nitro: { boostSince } })} />
                        </Row>
                        {nitro && <BadgeInfo iconUrl={nitro.iconUrl} text={nitro.description} />}
                        {boost && <BadgeInfo iconUrl={boost.iconUrl} text={t("nitro.boostBadgeLevel", { description: boost.description, level: boost.id.replace(/\D/g, "") })} />}
                    </>
                )}
            </Section>

            <Section title={t("nitro.profile.title")} description={t("nitro.profile.description")}>
                <Row label={t("nitro.themeColors.label")} hint={t("nitro.themeColors.hint")}>
                    <ColorPairField value={larp.profile.themeColors} onCommit={themeColors => LarpStore.update({ profile: { themeColors } })} />
                </Row>
                <Row label={t("nitro.banner.label")} hint={t("nitro.banner.hint")}>
                    <ImageField value={larp.profile.bannerUrl} maxBytes={1_400_000} onCommit={bannerUrl => LarpStore.update({ profile: { bannerUrl } })} />
                </Row>
                <Row label={t("nitro.animatedAvatar.label")} hint={t("nitro.animatedAvatar.hint")}>
                    <ImageField value={larp.profile.animatedAvatarUrl} maxBytes={1_400_000} onCommit={animatedAvatarUrl => LarpStore.update({ profile: { animatedAvatarUrl } })} />
                </Row>
            </Section>

            <p className={cl("muted")}>
                {t("nitro.serverFeaturesNote")}
            </p>
        </>
    );
}
