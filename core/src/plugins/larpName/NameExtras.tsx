/*
 * Larpcord, a standalone Discord client for local cosmetic larping
 * Copyright (c) 2026 Larpcord contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import ErrorBoundary from "@components/ErrorBoundary";
import { t, useLarpLocale } from "@plugins/larpCore/i18n";
import { useLarpProfileFor } from "@plugins/larpCore/store";

/**
 * Clan tag, verified check and owner crown – the same element in chat, member list, profile and hub preview.
 * Without userId it shows the own larp profile (hub preview).
 */
export function NameExtras({ className, userId }: { className?: string; userId?: string; }) {
    const larp = useLarpProfileFor(userId);
    useLarpLocale();
    if (!larp) return null;
    const { clanTag, extras } = larp;
    if (!clanTag && !extras.verifiedCheck && !extras.ownerCrown) return null;

    return (
        <span className={["larp-name-extras", className].filter(Boolean).join(" ")}>
            {extras.verifiedCheck && (
                <span className="larp-verified" title={t("name.badge.verified")} aria-label={t("name.badge.verified")}>
                    <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden>
                        <path fill="var(--brand-500, #5865f2)" d="M8 0.8 9.9 2.3l2.4-.2.7 2.3 2.1 1.2-.8 2.3.8 2.3-2.1 1.2-.7 2.3-2.4-.2L8 15.2l-1.9-1.5-2.4.2-.7-2.3-2.1-1.2.8-2.3-.8-2.3 2.1-1.2.7-2.3 2.4.2Z" />
                        <path fill="none" stroke="#fff" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" d="m5 8.2 2 2 4-4.3" />
                    </svg>
                </span>
            )}
            {extras.ownerCrown && (
                <span className="larp-crown" title={t("name.badge.owner")} aria-label={t("name.badge.owner")}>
                    <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden>
                        <path fill="#f0b232" d="M2 12h12l1-7-4 3-3-5-3 5-4-3 1 7Zm0 1.2h12V14H2v-.8Z" />
                    </svg>
                </span>
            )}
            {clanTag && (
                <span className="larp-clan-tag" title={t("name.badge.clanTag", { tag: clanTag.tag })}>
                    {clanTag.iconUrl && <img src={clanTag.iconUrl} alt="" />}
                    {clanTag.tag}
                </span>
            )}
        </span>
    );
}

export const SafeNameExtras = ErrorBoundary.wrap(NameExtras, { noop: true });
