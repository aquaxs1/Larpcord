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

import { getGlobalName, getUsername, guardAccountBody, overrideMember, realName, realUserView, refreshOwnUser, resetSelfIdCache } from "./names";
import { toDisplayNameStyles } from "./nameStyles";
import { NameTab } from "./NameTab";

/*
 * - Namens-Stil (Schrift, Verlauf, Glow): über Discords native displayNameStyles am User-Objekt.
 *   Discord rendert den Stil dann selbst überall (Chat, Mitgliederliste, DMs, Profil).
 * - Clan-Tag, Verified-Häkchen, Owner-Krone: über Vencords Decoration-APIs (Chat, Mitgliederliste)
 *   und die Badge-API (Profil). Keine erfundenen Server-Daten, keine Requests.
 * - Name-Änderer: Getter für username/globalName am User-Modell (siehe names.ts), dadurch
 *   überall gleich: Chat, Profil, Mitgliederliste, User-Panel, Erwähnungen, Tooltips.
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
let unsubscribeNames: (() => void) | undefined;

export default definePlugin({
    name: "LarpName",
    description: "Name-Änderer, Clan-Tag, Verified-Häkchen, Owner-Krone und Namens-Stile (Schrift, Verlauf, Glow) für deinen eigenen Namen. Nur lokal sichtbar.",
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
        },
        {
            // Name-Änderer: username/globalName werden zu Gettern, der echte Wert liegt in _larpUN/_larpGN.
            // Klone per {...this} tragen nur die Backing-Felder weiter, der Konstruktor liest sie als Fallback.
            find: "get avatarDecoration(){",
            group: true,
            replacement: [
                {
                    match: /(?<=;)username;/,
                    replace: "_larpUN=null;get username(){return $self.getUsername(this,this._larpUN)}set username(e){this._larpUN=e}"
                },
                {
                    match: /(?<=;)globalName;/,
                    replace: "_larpGN=null;get globalName(){return $self.getGlobalName(this,this._larpGN)}set globalName(e){this._larpGN=e}"
                },
                {
                    match: /(this\.username=(\i)\.username)\?\?""/,
                    replace: '$1??$2._larpUN??""'
                },
                {
                    match: /(this\.globalName=(\i)\.global_name\?\?\i\.globalName)(?=[,;])/,
                    replace: "$1??$2._larpGN"
                }
            ]
        },
        {
            // "Larp-Name statt Server-Nicknames": der eigene Nick wird nur beim Lesen ausgeblendet,
            // im Store bleibt der echte Nick (getTrueMember und interne Updates sind unberührt).
            find: 'displayName="GuildMemberStore"',
            replacement: {
                match: /(?<=\})getMember\((\i),(\i)\)\{/,
                replace: "getMember($1,$2){return $self.overrideMember(this.__larpGetMember($1,$2),$2)}__larpGetMember($1,$2){"
            }
        },
        {
            // Regel 1: Ein mit dem Larp-Namen vorausgefülltes Konto-Formular darf ihn nie an Discord senden
            // (das Server-Profil nutzt dieselbe Aktion, aber mit guildId dahinter)
            find: 'type:"USER_PROFILE_SETTINGS_SUBMIT"})',
            replacement: {
                match: /(\.patch\(\{url:\i\.\i\.ME,oldFormErrors:!0,body:)(\i)/,
                replace: "$1$self.guardAccountBody($2)"
            }
        },
        {
            // Eingebettete Aktivitäten (Apps im Sprachkanal) bekommen immer den echten Namen
            find: /user_id:\i\.userId,username:\i\.username,global_name:/,
            replacement: {
                match: /(?<=user_id:\i\.userId,)username:(\i)\.username,global_name:\1\.globalName/,
                replace: 'username:$self.realName($1,"username"),global_name:$self.realName($1,"globalName")'
            }
        },
        {
            // RPC-Serialisierung (Spiele, Overlays) ebenfalls mit echtem Namen
            find: /global_name:\i,avatar:\i,avatar_decoration_data:/,
            replacement: {
                match: /(?<=premiumType:\i\}=)(\i)(?=;return\{id:)/,
                replace: "$self.realUserView($1)"
            }
        }
    ],

    getUsername,
    getGlobalName,
    overrideMember,
    guardAccountBody,
    realName,
    realUserView,

    flux: {
        CONNECTION_OPEN: resetSelfIdCache,
        LOGOUT: resetSelfIdCache
    },

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

        // Bei geänderten Namen das eigene User-Objekt austauschen, damit Discord sofort neu rendert
        let lastNames = JSON.stringify(LarpStore.get().names);
        unsubscribeNames = LarpStore.subscribe(() => {
            const names = JSON.stringify(LarpStore.get().names);
            if (names === lastNames) return;
            lastNames = names;
            refreshOwnUser();
        });
    },

    stop() {
        unregisterHubTab("name");
        unsubscribeNames?.();
        refreshOwnUser();
    }
});
