/*
 * Larpcord, a standalone Discord client for local cosmetic larping
 * Copyright (c) 2026 Larpcord contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import ErrorBoundary from "@components/ErrorBoundary";
import { platformOf } from "@plugins/larpConnections/platforms";
import { t, useLarpLocale } from "@plugins/larpCore/i18n";
import { LARPCORD_LOGO } from "@plugins/larpCore/logo";
import { formatDate, getLarpBadges } from "@plugins/larpCore/profileBadges";
import { useLarpProfile } from "@plugins/larpCore/store";
import { LarpProfile } from "@plugins/larpCore/types";
import { ensureNameFontsLoaded, NAME_FONTS, resolveEffect } from "@plugins/larpName/nameStyles";
import { UserStore } from "@webpack/common";
import type { CSSProperties } from "react";

import { cl } from "./components";

/**
 * CSS approximation of Discord's display name styles for Larpcord's own preview.
 * Discord renders the real style itself (see larpName/nameStyles.ts → toDisplayNameStyles).
 */
export function nameStyleCss(style: LarpProfile["nameStyle"]): CSSProperties {
    if (!style) return {};
    const css: CSSProperties = {};
    const fontKey = style.font && NAME_FONTS[style.font] ? style.font : undefined;
    const font = fontKey ? NAME_FONTS[fontKey].css : style.font;
    if (font) {
        if (fontKey && NAME_FONTS[fontKey].google) ensureNameFontsLoaded();
        css.fontFamily = font.startsWith("var(") ? font : `"${font}", var(--font-display)`;
    }

    const effect = resolveEffect(style);
    if (!effect) return css;
    const [c1, c2] = style.gradient ?? ["#ff73fa", "#5865f2"];
    const gradientText = (bg: string) => {
        css.backgroundImage = bg;
        css.WebkitBackgroundClip = "text";
        css.backgroundClip = "text";
        css.WebkitTextFillColor = "transparent";
    };

    switch (effect) {
        case "SOLID":
            css.color = c1;
            break;
        case "GRADIENT":
            gradientText(`linear-gradient(90deg, ${c1}, ${c2})`);
            break;
        case "NEON":
            css.color = "#fff";
            css.textShadow = `0 0 2px ${c1}, 0 0 6px ${c1}, 0 0 12px ${c1}`;
            break;
        case "TOON":
            css.color = c1;
            css.WebkitTextStroke = "1px rgb(0 0 0 / 70%)";
            css.textShadow = `2px 2px 0 ${c2}`;
            break;
        case "POP":
            css.color = c1;
            css.textShadow = `2px 2px 0 ${c2}`;
            break;
        case "GLOW":
            css.color = c1;
            css.filter = `drop-shadow(0 0 4px ${c1}aa) drop-shadow(0 0 10px ${c1}66)`;
            break;
        case "PRISM":
            gradientText(`linear-gradient(90deg, ${c1}, ${c2}, ${c1}, ${c2})`);
            break;
        case "GUMMY":
            gradientText(`linear-gradient(180deg, ${c1}, ${c2})`);
            css.filter = "drop-shadow(0 2px 0 rgb(0 0 0 / 35%))";
            break;
    }
    return css;
}

export function decorationUrl(asset: string, size = 160) {
    return `https://cdn.discordapp.com/avatar-decoration-presets/${asset}.png?size=${size}&passthrough=true`;
}

function PreviewCard() {
    const larp = useLarpProfile();
    useLarpLocale();
    const user = UserStore.getCurrentUser();
    if (!user) return null;

    const [c1, c2] = larp.profile.themeColors ?? ["#1e1f22", "#2b2d31"];
    const avatar = larp.profile.animatedAvatarUrl ?? user.getAvatarURL(undefined, 128, true);
    const badges = getLarpBadges(larp);
    const displayName = (user as any).globalName || user.username;
    const activity = larp.activities?.enabled ? larp.activities.list.find(a => a.enabled) : undefined;
    const connections = larp.connections?.list.filter(c => c.enabled) ?? [];

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
                    {larp.extras.verifiedCheck && <span className={cl("preview-check")} title={t("core.preview.verified")}>✔</span>}
                    {larp.extras.ownerCrown && <span title={t("core.preview.serverOwner")}>👑</span>}
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

                {activity && (
                    <div className={cl("preview-activity")}>
                        {activity.type === 4 ? (
                            <span>{activity.emoji ? activity.emoji + " " : ""}{activity.state || activity.name}</span>
                        ) : (
                            <>
                                <small>{t(`activity.header.${activity.type}`)}</small>
                                <strong>{activity.name}</strong>
                                {activity.details && <span>{activity.details}</span>}
                            </>
                        )}
                    </div>
                )}

                <div className={cl("preview-meta")}>
                    <div>
                        <small>{t("core.preview.memberSince")}</small>
                        <span>{formatDate(larp.memberSince ?? new Date(Number((BigInt(user.id) >> 22n) + 1420070400000n)).toISOString())}</span>
                    </div>
                    {larp.nitro.enabled && larp.nitro.since && (
                        <div>
                            <small>{t("core.preview.nitroSince")}</small>
                            <span>{formatDate(larp.nitro.since)}</span>
                        </div>
                    )}
                </div>

                {connections.length > 0 && (
                    <div className={cl("preview-connections")}>
                        <small>{t("core.preview.connections")}</small>
                        <div>
                            {connections.map(c => (
                                <span key={c.id} className={cl("preview-connection")} title={platformOf(c.type).label}>
                                    <i style={{ background: platformOf(c.type).color }} />
                                    {c.name}{c.verified ? " ✔" : ""}
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                {larp.watermark && <div className={cl("watermark")}><img src={LARPCORD_LOGO} alt="" draggable={false} /> Larpcord</div>}
            </div>
        </div>
    );
}

/** Fehlermeldung erst beim Rendern übersetzen (ErrorBoundary.wrap würde sie beim Laden des Moduls einfrieren) */
export function Preview() {
    return (
        <ErrorBoundary message={t("core.preview.error")}>
            <PreviewCard />
        </ErrorBoundary>
    );
}
