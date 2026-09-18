/*
 * Larpcord, a standalone Discord client for local cosmetic larping
 * Copyright (c) 2026 Larpcord contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { BadgePosition, ProfileBadge } from "@api/Badges";
import ErrorBoundary from "@components/ErrorBoundary";
import { registerHubTab, unregisterHubTab } from "@plugins/larpCore/hub/registry";
import { isSelf, LarpStore, useLarpProfile } from "@plugins/larpCore/store";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

import { toDisplayNameStyles } from "./nameStyles";
import { NameTab } from "./NameTab";

/*
 * - Namens-Stil (Schrift, Verlauf, Glow): über Discords native displayNameStyles am User-Objekt.
 *   Discord rendert den Stil dann selbst überall (Chat, Mitgliederliste, DMs, Profil).
 * - Clan-Tag, Verified-Häkchen, Owner-Krone: über Vencords Decoration-APIs (Chat, Mitgliederliste)
 *   und die Badge-API (Profil). Keine erfundenen Server-Daten, keine Requests.
 */

export function NameExtras({ className }: { className?: string; }) {
    const larp = useLarpProfile();
    const { clanTag, extras } = larp;
    if (!clanTag && !extras.verifiedCheck && !extras.ownerCrown) return null;

    return (
        <span className={["larp-name-extras", className].filter(Boolean).join(" ")}>
            {extras.verifiedCheck && (
                <span className="larp-verified" title="Verifiziert" aria-label="Verifiziert">
                    <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden>
                        <path fill="var(--brand-500, #5865f2)" d="M8 0.8 9.9 2.3l2.4-.2.7 2.3 2.1 1.2-.8 2.3.8 2.3-2.1 1.2-.7 2.3-2.4-.2L8 15.2l-1.9-1.5-2.4.2-.7-2.3-2.1-1.2.8-2.3-.8-2.3 2.1-1.2.7-2.3 2.4.2Z" />
                        <path fill="none" stroke="#fff" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" d="m5 8.2 2 2 4-4.3" />
                    </svg>
                </span>
            )}
            {extras.ownerCrown && (
                <span className="larp-crown" title="Server-Eigentümer" aria-label="Server-Eigentümer">
                    <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden>
                        <path fill="#f0b232" d="M2 12h12l1-7-4 3-3-5-3 5-4-3 1 7Zm0 1.2h12V14H2v-.8Z" />
                    </svg>
                </span>
            )}
            {clanTag && (
                <span className="larp-clan-tag" title={`Clan-Tag ${clanTag.tag}`}>
                    {clanTag.iconUrl && <img src={clanTag.iconUrl} alt="" />}
                    {clanTag.tag}
                </span>
            )}
        </span>
    );
}

const SafeNameExtras = ErrorBoundary.wrap(NameExtras, { noop: true });

const ProfileExtrasBadge: ProfileBadge = {
    id: "larpcord_name_extras",
    key: "larpcord_name_extras",
    position: BadgePosition.START,
    shouldShow: ({ userId }) => {
        if (!isSelf(userId)) return false;
        const { clanTag, extras } = LarpStore.get();
        return !!clanTag || extras.verifiedCheck || extras.ownerCrown;
    },
    component: () => <SafeNameExtras className="larp-name-extras-profile" />
};

let stylesCache: { key: string; value: unknown; } | undefined;

export default definePlugin({
    name: "LarpName",
    description: "Clan-Tag, Verified-Häkchen, Owner-Krone und Namens-Stile (Schrift, Verlauf, Glow) für deinen eigenen Namen. Nur lokal sichtbar.",
    tags: ["Larpcord"],
    authors: [Devs.Larpcord],
    enabledByDefault: true,
    dependencies: ["LarpCore", "MessageDecorationsAPI", "MemberListDecoratorsAPI"],

    userProfileBadge: ProfileExtrasBadge,

    renderMessageDecoration: ({ message }) => isSelf(message?.author?.id) ? <SafeNameExtras /> : null,
    renderMemberListDecorator: ({ user }) => isSelf(user?.id) ? <SafeNameExtras /> : null,

    patches: [
        {
            // displayNameStyles am User-Modell wird zu Getter/Setter. Discord klont User per {...this},
            // daher merkt sich der Konstruktor zusätzlich den Originalwert aus _larpDNS.
            find: "get avatarDecoration(){",
            group: true,
            replacement: [
                {
                    match: /(?<=;)displayNameStyles;/,
                    replace: "_larpDNS=null;get displayNameStyles(){return $self.getDisplayNameStyles(this,this._larpDNS)}set displayNameStyles(e){this._larpDNS=e}"
                },
                {
                    match: /(this\.displayNameStyles=)(\i)\.displayNameStyles\?\?/,
                    replace: "$1$2.displayNameStyles??$2._larpDNS??"
                }
            ]
        }
    ],

    getDisplayNameStyles(user: { id: string; }, original: unknown) {
        try {
            if (!isSelf(user?.id)) return original;
            const style = LarpStore.get().nameStyle;
            const key = JSON.stringify(style ?? null);
            if (stylesCache?.key !== key) stylesCache = { key, value: toDisplayNameStyles(style) };
            return stylesCache.value ?? original;
        } catch {
            return original;
        }
    },

    start() {
        registerHubTab({ id: "name", title: "Name", Component: NameTab });
    },

    stop() {
        unregisterHubTab("name");
    }
});
