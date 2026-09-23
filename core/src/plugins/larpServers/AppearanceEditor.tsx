/*
 * Larpcord, a standalone Discord client for local cosmetic larping
 * Copyright (c) 2026 Larpcord contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Btn, cl, ImageField, Row, TextField } from "@plugins/larpCore/hub/components";
import { t } from "@plugins/larpCore/i18n";
import { LarpStore } from "@plugins/larpCore/store";
import { ServerLarp } from "@plugins/larpCore/types";

/*
 * Lokales Aussehen eines Servers: Name, Icon und Banner. Alles nur in der eigenen Anzeige,
 * der Server selbst bleibt unverändert (siehe guilds.ts).
 */

function setAppearance(guildId: string, patch: Partial<Pick<ServerLarp, "name" | "iconUrl" | "bannerUrl">>) {
    LarpStore.update({ servers: { [guildId]: patch } });
}

export function AppearanceEditor({ guildId, larp, realName }: { guildId: string; larp: ServerLarp; realName: string; }) {
    const changed = !!(larp.name || larp.iconUrl || larp.bannerUrl);

    return (
        <div className={cl("appearance")}>
            <p className={cl("muted")}>{t("appearance.description")}</p>

            <Row label={t("appearance.name")} hint={t("appearance.nameHint", { name: realName })}>
                <TextField value={larp.name} maxLength={100} placeholder={realName} onCommit={name => setAppearance(guildId, { name })} />
            </Row>
            <Row label={t("appearance.icon")} hint={t("appearance.imageHint")}>
                <ImageField value={larp.iconUrl} maxBytes={1_400_000} onCommit={iconUrl => setAppearance(guildId, { iconUrl })} />
            </Row>
            <Row label={t("appearance.banner")} hint={t("appearance.imageHint")}>
                <ImageField value={larp.bannerUrl} maxBytes={2_000_000} onCommit={bannerUrl => setAppearance(guildId, { bannerUrl })} />
            </Row>

            <div className={cl("inline")}>
                <Btn
                    variant="secondary"
                    disabled={!changed}
                    onClick={() => setAppearance(guildId, { name: undefined, iconUrl: undefined, bannerUrl: undefined })}
                >
                    {t("appearance.reset")}
                </Btn>
            </div>
        </div>
    );
}
