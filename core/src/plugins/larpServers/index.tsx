/*
 * Larpcord, a standalone Discord client for local cosmetic larping
 * Copyright (c) 2026 Larpcord contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { registerHubTab, unregisterHubTab } from "@plugins/larpCore/hub/registry";
import { t } from "@plugins/larpCore/i18n";
import { isSelf, LarpStore, logger } from "@plugins/larpCore/store";
import { ServerLarp } from "@plugins/larpCore/types";
import { Devs } from "@utils/constants";
import { getCurrentGuild } from "@utils/discord";
import definePlugin from "@utils/types";

import { displayGuild, displayGuildList, displayGuildRecord, guardGuildBody, guildBannerUrl as bannerUrlFor, guildIconUrl as iconUrlFor, GuildLike, larpFor } from "./guilds";
import { RoleIcon } from "./RoleIcon";
import { applyRoleColor, ColorProps, isLarpRole, resolveRoleIcon, withLarpRoles } from "./roles";
import { ServersTab } from "./ServersTab";

/*
 * Regel 3: Server-Badges sind reine Anzeige. Die Guild selbst (features, premiumTier …) bleibt
 * unverändert, denn davon hängen echte Funktionen ab (Upload-Limits, Emoji-Slots, Vanity-URL …).
 * Stattdessen bekommen nur die Anzeige-Komponenten eine lokale "Anzeige-Kopie" der Guild.
 */


/**
 * Ersetzung für den Rollen-Abschnitt im Profil. Beide Fundstellen (Popout und Fenster)
 * bauen die Liste gleich auf: `getManyRoles(<guild>, member?.roles ?? []).sort(…)`.
 */
const PROFILE_ROLES_REPLACEMENT = {
    match: /(\{userId:(\i),[^}]*\}=\i[\s\S]{0,600}?)(\i\.\i\.getManyRoles\((\i(?:\.id)?),\i\?\?\[\]\)\.sort\(\i\.\i\))/,
    replace: "$1$self.withLarpRoles($3,$4,$2)"
};

function displayFeatureSet(guild: GuildLike, larp: ServerLarp) {
    const features = new Set(guild.features);
    if (larp.partner) features.add("PARTNERED");
    if (larp.verified) features.add("VERIFIED");
    return features;
}

export default definePlugin({
    name: "LarpServers",
    get description() {
        return t("plugin.LarpServers.description");
    },
    tags: ["Larpcord"],
    authors: [Devs.Larpcord],
    enabledByDefault: true,
    dependencies: ["LarpCore", "MessageDecorationsAPI", "MemberListDecoratorsAPI"],

    renderMessageDecoration: ({ channel, message }) =>
        isSelf(message?.author?.id) ? <RoleIcon guildId={channel?.guild_id} /> : null,
    renderMemberListDecorator: ({ user, type }) =>
        type === "guild" && isSelf(user?.id) ? <RoleIcon guildId={getCurrentGuild()?.id} /> : null,

    patches: [
        {
            // Guild-Badge (Server-Header, Tooltip der Serverleiste): lokale Kopie der Features
            find: ".INTERNAL_EMPLOYEE_ONLY)?this.renderBadge(",
            replacement: {
                match: /(?<=render\(\)\{let\{guild:(\i)\}=this\.props,\i=)new Set\(\1\.features\)/,
                replace: "$self.displayFeatures($1)"
            }
        },
        {
            // Abgeleitete Anzeige-Infos einer Guild (Badge-Typ, Boost-Stufe/-Anzahl)
            find: /="INVITE_ONLY";\i\.has\(/,
            replacement: {
                match: /(function \i\((\i)\)\{)(?=var \i;let \i=new Set\(\2\.features\))/,
                replace: "$1$2=$self.displayGuild($2);"
            }
        },
        {
            // Server-Header: Badge statt Boost-Gem, bzw. Boost-Gem mit Stufe und Anzahl
            find: /premiumSubscriberCount:\i\}=\i;if\(0===\i&&/,
            replacement: [
                {
                    match: /(?<=\{premiumTier:\i,premiumSubscriberCount:\i\}=)(\i)(?=;if\(0===)/,
                    replace: "$self.displayGuild($1)"
                },
                {
                    match: /(\i)\.features\.has\(\i\.GuildFeatures\.VERIFIED\)\|\|/,
                    replace: "$self.hasDisplayBadge($1)||$&"
                }
            ]
        },
        {
            // Guild-Info-Karte (z. B. Tooltip/Einladung): Badge anzeigen
            find: /customSubtext:\i\}=\i/,
            replacement: {
                match: /(?<=let \i=)(?=(\i)\.features\.has\(\i\.GuildFeatures\.VERIFIED\)\|\|)/,
                replace: "$self.hasDisplayBadge($1)||"
            }
        },
        // Rollen-Abschnitt im eigenen Profil: Popout und Profil-Fenster sind zwei Module mit
        // gleichem Aufbau, sie unterscheiden sich nur darin, ob sie die Guild oder ihre ID halten.
        // Ergänzt wird nur die fertig sortierte *Anzeige*-Liste, nie member.roles (harte Regel).
        {
            find: /getManyRoles\(\i\.id,\i\?\?\[\]\)\.sort\(/,
            replacement: PROFILE_ROLES_REPLACEMENT
        },
        {
            find: /getManyRoles\(\i,\i\?\?\[\]\)\.sort\(/,
            replacement: PROFILE_ROLES_REPLACEMENT
        },
        {
            // Namensfarbe im Chat: nur die Anzeige-Farben des Autors werden ersetzt.
            // Die rechte Seite darf auch schon ein Aufruf sein (Vencords IrcColors patcht dieselbe Stelle).
            find: '="SYSTEM_TAG"',
            replacement: {
                match: /(\{[^{}]*colorString:\i,colorStrings:\i,colorRoleName:\i[^{}]*\}=)((?:[^,;]|\([^()]*\))+),/,
                replace: "$1$self.messageColors($2,arguments[0]),"
            }
        },
        {
            // Namensfarbe in der Mitgliederliste
            find: /\{colorRoleName:\i,colorString:\i,colorStrings:\i,name:\i,hideClanTag:/,
            replacement: {
                match: /(\{colorRoleName:\i,colorString:\i,colorStrings:\i,name:\i,hideClanTag:\i,user:\i,guildId:\i,[^}]*\}=)(\i)/,
                replace: "$1$self.memberListColors($2)"
            }
        },
        {
            // Server umgestalten: Die Lese-Methoden liefern Anzeige-Kopien mit Larp-Name, -Icon
            // und -Banner. Die Einträge im Store selbst bleiben unverändert.
            find: 'displayName="GuildStore"',
            group: true,
            replacement: [
                {
                    // getGuild ist ein Klassenfeld mit Pfeilfunktion, keine Methode
                    match: /getGuild=(\i)=>\{/,
                    replace: "getGuild=$1=>$self.displayGuild(this.__larpGetGuild($1));__larpGetGuild=$1=>{"
                },
                {
                    // Serverleiste und Ordner lesen die ganze Liste statt einzelner Server
                    match: /getGuilds=(this\.\i\.memoized\(\i=>\(\{\.\.\.\i\}\)\));/,
                    replace: "__larpGetGuilds=$1;getGuilds=()=>$self.displayGuildRecord(this.__larpGetGuilds());"
                },
                {
                    match: /getGuildsArray=(this\.\i\.memoized\(\i=>Object\.values\(\i\)\));/,
                    replace: "__larpGetGuildsArray=$1;getGuildsArray=()=>$self.displayGuildList(this.__larpGetGuildsArray());"
                }
            ]
        },
        {
            // Server-Icon: eigene URL statt der CDN-Adresse
            find: 'path:"icons"',
            replacement: {
                match: /\{id:(\i),icon:\i,size:\i,canAnimate:[^}]*\}=\i;/,
                replace: "$&const larpGuildIcon=$self.guildIconUrl($1);if(larpGuildIcon!=null)return larpGuildIcon;"
            }
        },
        {
            // Server-Banner (Kanalliste, Server-Einstellungen)
            find: "/banners/",
            replacement: {
                match: /(\{id:(\i),banner:\i\}=\i,\i=arguments\.length>1[^;]*;)/,
                replace: "$1const larpGuildBanner=$self.guildBannerUrl($2);if(larpGuildBanner!=null)return larpGuildBanner;"
            }
        },
        {
            // Regel 1: Ein mit Larp-Werten vorausgefülltes Server-Formular darf sie nie senden
            find: '"GUILD_SETTINGS_SUBMIT"',
            replacement: {
                match: /(\.patch\(\{url:\i\.\i\.GUILD\((\i)\),query:\{for_discovery:[^}]*\},body:)(\i)/,
                replace: "$1$self.guardGuildBody($2,$3)"
            }
        },
        {
            // Rollen-Icons: "larp:<id>" zur gespeicherten URL auflösen, statt eine CDN-URL zu bauen
            find: "/role-icons",
            replacement: [
                {
                    match: /let\{id:\i,icon:(\i)\}=\i;if\(null==\1\)return;/,
                    replace: "$&const larpIcon=$self.roleIconUrl($1);if(larpIcon!=null)return larpIcon;"
                },
                {
                    // Rollen-Icons brauchen normalerweise ein Server-Feature. Für Larp-Rollen nicht.
                    match: /(\i)\?\.tags\?\.subscription_listing_id!=null\|\|/,
                    replace: "$self.isLarpRole($1)||$&"
                }
            ]
        }
    ],

    displayFeatures(guild: GuildLike) {
        try {
            const larp = larpFor(guild?.id);
            return larp ? displayFeatureSet(guild, larp) : new Set(guild.features);
        } catch (e) {
            logger.error("displayFeatures", e);
            return new Set(guild?.features ?? []);
        }
    },

    hasDisplayBadge(guild: GuildLike) {
        try {
            const larp = larpFor(guild?.id);
            return !!(larp?.partner || larp?.verified);
        } catch {
            return false;
        }
    },

    displayGuild,
    displayGuildRecord,
    displayGuildList,
    guardGuildBody,

    guildIconUrl(guildId: unknown) {
        try {
            return iconUrlFor(guildId);
        } catch {
            return undefined;
        }
    },

    guildBannerUrl(guildId: unknown) {
        try {
            return bannerUrlFor(guildId);
        } catch {
            return undefined;
        }
    },

    withLarpRoles,
    isLarpRole,

    roleIconUrl(icon: unknown) {
        try {
            return resolveRoleIcon(icon);
        } catch {
            return undefined;
        }
    },

    /** Farben des Nachrichten-Autors (Chat) */
    messageColors<T extends ColorProps>(author: T, props: any): T {
        try {
            const userId = props?.userOverride?.id ?? props?.message?.author?.id;
            const guildId = props?.channel?.guild_id;
            return applyRoleColor(author, guildId, userId);
        } catch (e) {
            logger.error("messageColors", e);
            return author;
        }
    },

    /** Farben eines Eintrags der Mitgliederliste */
    memberListColors<T extends ColorProps & { user?: { id?: string; }; guildId?: string; }>(props: T): T {
        try {
            return applyRoleColor(props, props?.guildId, props?.user?.id);
        } catch (e) {
            logger.error("memberListColors", e);
            return props;
        }
    },

    start() {
        registerHubTab({ id: "servers", title: "Server", Component: ServersTab });
    },

    stop() {
        unregisterHubTab("servers");
    }
});
