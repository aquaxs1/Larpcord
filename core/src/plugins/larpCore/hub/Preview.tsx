/*
 * Larpcord, a standalone Discord client for local cosmetic larping
 * Copyright (c) 2026 Larpcord contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import ErrorBoundary from "@components/ErrorBoundary";
import { formatDate, getLarpBadges } from "@plugins/larpCore/profileBadges";
import { useLarpProfile } from "@plugins/larpCore/store";
import { LarpProfile } from "@plugins/larpCore/types";
import { UserStore } from "@webpack/common";
import type { CSSProperties } from "react";

import { cl } from "./components";

export function nameStyleCss(style: LarpProfile["nameStyle"]): CSSProperties {
    if (!style) return {};
    const css: CSSProperties = {};
    if (style.font) css.fontFamily = `"${style.font}", var(--font-display)`;
    if (style.gradient) {
        css.backgroundImage = `linear-gradient(90deg, ${style.gradient[0]}, ${style.gradient[1]})`;
        css.WebkitBackgroundClip = "text";
        css.backgroundClip = "text";
        css.WebkitTextFillColor = "transparent";
    }
    if (style.glow) {
        const c = style.gradient?.[0] ?? "#ffffff";
        css.filter = `drop-shadow(0 0 4px ${c}aa) drop-shadow(0 0 10px ${c}66)`;
    }
    return css;
}

export function decorationUrl(asset: string, size = 160) {
    return `https://cdn.discordapp.com/avatar-decoration-presets/${asset}.png?size=${size}&passthrough=true`;
}

function PreviewCard() {
    const larp = useLarpProfile();
    const user = UserStore.getCurrentUser();
    if (!user) return null;

    const [c1, c2] = larp.profile.themeColors ?? ["#1e1f22", "#2b2d31"];
    const avatar = larp.profile.animatedAvatarUrl ?? user.getAvatarURL(undefined, 128, true);
    const badges = getLarpBadges(larp);
    const displayName = (user as any).globalName || user.username;

    return (
        <div className={cl("preview")} style={{ background: `linear-gradient(180deg, ${c1}, ${c2})` }}>
            <div
                className={cl("preview-banner")}
                style={larp.profile.bannerUrl
                    ? { backgroundImage: `url("${CSS.escape(larp.profile.bannerUrl)}")` }
                    : { background: c1 }}
            />
            <div className={cl("preview-avatar")}>
                <img src={avatar} alt="" />
                {larp.decoration && <img className={cl("preview-decoration")} src={decorationUrl(larp.decoration.asset)} alt="" />}
            </div>
            <div className={cl("preview-body")}>
                <div className={cl("preview-name")}>
                    <span style={nameStyleCss(larp.nameStyle)}>{displayName}</span>
                    {larp.extras.verifiedCheck && <span className={cl("preview-check")} title="Verifiziert">✔</span>}
                    {larp.extras.ownerCrown && <span title="Server-Eigentümer">👑</span>}
                    {larp.clanTag && (
                        <span className={cl("preview-clan")}>
                            {larp.clanTag.iconUrl && <img src={larp.clanTag.iconUrl} alt="" />}
                            {larp.clanTag.tag}
                        </span>
                    )}
                </div>
                <div className={cl("preview-username")}>{user.username}</div>

                {badges.length > 0 && (
                    <div className={cl("preview-badges")}>
                        {badges.map(b => <img key={b.key} src={b.iconUrl} title={b.description} alt={b.description} />)}
                    </div>
                )}

                <div className={cl("preview-meta")}>
                    <div>
                        <small>Mitglied seit</small>
                        <span>{formatDate(larp.memberSince ?? new Date(Number((BigInt(user.id) >> 22n) + 1420070400000n)).toISOString())}</span>
                    </div>
                    {larp.nitro.enabled && larp.nitro.since && (
                        <div>
                            <small>Nitro seit</small>
                            <span>{formatDate(larp.nitro.since)}</span>
                        </div>
                    )}
                </div>

                {larp.watermark && <div className={cl("watermark")}>🎭 Larpcord</div>}
            </div>
        </div>
    );
}

export const Preview = ErrorBoundary.wrap(PreviewCard, { message: "Vorschau konnte nicht gerendert werden." });
