/*
 * Larpcord, a standalone Discord client for local cosmetic larping
 * Copyright (c) 2026 Larpcord contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { getSelfId, LarpStore, logger } from "@plugins/larpCore/store";
import { GuildMemberStore, showToast, Toasts, UserStore } from "@webpack/common";

/*
 * Name-Änderer: Username und Anzeigename des eigenen Users werden lokal überschrieben.
 *
 * Discords User-Modell bekommt für `username` und `globalName` Getter (siehe Patch in index.tsx).
 * Der echte Wert liegt im Backing-Feld `_larpUN` bzw. `_larpGN`. Weil Discord Nutzer per
 * `{...user}` klont, landen nur die Backing-Felder im Klon, nie der Larp-Wert. So bleibt der
 * echte Name im Speicher immer erhalten.
 *
 * Schutz nach außen (Regel 1):
 * - guardAccountBody entfernt Larp-Namen aus PATCH /users/@me, falls ein von Discord
 *   vorausgefülltes Formular sie mitschicken würde.
 * - realUserView/realName liefern den echten Namen an Stellen, die User-Daten an Aktivitäten
 *   oder RPC-Clients weitergeben.
 */

interface NamedUser {
    id: string;
    username?: string;
    globalName?: string | null;
    _larpUN?: string;
    _larpGN?: string | null;
}

// Eigene User-ID zwischenspeichern: Die Getter laufen bei jedem Namenszugriff auf jeden User.
let selfId: string | undefined;
export function resetSelfIdCache() {
    selfId = undefined;
}
function fastSelfId() {
    return selfId ??= getSelfId();
}

function activeNames() {
    const { names } = LarpStore.get();
    return names.username || names.displayName ? names : undefined;
}

export function getUsername(user: NamedUser, real: string) {
    try {
        if (user?.id == null || user.id !== fastSelfId()) return real;
        return LarpStore.get().names.username || real;
    } catch {
        return real;
    }
}

export function getGlobalName(user: NamedUser, real: string | null | undefined) {
    try {
        if (user?.id == null || user.id !== fastSelfId()) return real;
        return LarpStore.get().names.displayName || real;
    } catch {
        return real;
    }
}

/** Echter Wert eines Namensfelds, auch wenn der Getter gerade den Larp-Namen liefert */
export function realName(user: NamedUser | null | undefined, key: "username" | "globalName") {
    try {
        if (user == null || typeof user !== "object") return user?.[key];
        const backing = key === "username" ? "_larpUN" : "_larpGN";
        return backing in user ? user[backing] : user[key];
    } catch {
        return undefined;
    }
}

/** Sicht auf einen User mit echten Namen (für Serialisierung an Dritte) */
export function realUserView<T extends NamedUser>(user: T): T {
    try {
        if (user?.id == null || user.id !== fastSelfId() || !("_larpUN" in user || "_larpGN" in user)) return user;
        return Object.create(user, {
            username: { value: realName(user, "username"), enumerable: true },
            globalName: { value: realName(user, "globalName"), enumerable: true }
        });
    } catch {
        return user;
    }
}

export function getRealNames() {
    const user = UserStore.getCurrentUser() as unknown as NamedUser | undefined;
    return {
        username: realName(user, "username") as string | undefined,
        globalName: realName(user, "globalName") as string | null | undefined
    };
}

// ---- Server-Nicknames ----

interface Member { userId?: string; nick?: string | null; }
const memberCache = new WeakMap<object, { version: number; member: Member; }>();

/** Blendet den eigenen Server-Nickname aus, damit überall der Larp-Name erscheint */
export function overrideMember<T extends Member | null | undefined>(member: T, userId: string): T {
    try {
        if (member == null || member.nick == null || userId !== fastSelfId()) return member;
        const names = activeNames();
        if (!names?.overrideNicknames) return member;

        // Pro Member-Objekt und Store-Version cachen, damit React-Memos stabil bleiben
        const cached = memberCache.get(member);
        if (cached?.version === LarpStore.version) return cached.member as T;
        const copy = { ...member, nick: null };
        memberCache.set(member, { version: LarpStore.version, member: copy });
        return copy as T;
    } catch {
        return member;
    }
}

// ---- Schutz vor echten Namensänderungen ----

/**
 * Wird mit dem Body von PATCH /users/@me aufgerufen. Enthält er einen Larp-Namen (z. B. weil
 * Discords Formular mit dem Larp-Namen vorausgefüllt war), wird das Feld entfernt.
 */
export function guardAccountBody<T extends Record<string, any>>(body: T): T {
    try {
        if (body == null || typeof body !== "object") return body;
        const names = activeNames();
        if (!names) return body;

        const real = getRealNames();
        const out: Record<string, any> = { ...body };
        const removed: string[] = [];
        if (names.username && out.username === names.username && out.username !== real.username) {
            delete out.username;
            removed.push("Username");
        }
        if (names.displayName && out.global_name === names.displayName && out.global_name !== real.globalName) {
            delete out.global_name;
            removed.push("Anzeigename");
        }
        if (!removed.length) return body;

        logger.warn("Larp-Namen aus Konto-Update entfernt:", removed);
        showToast(`Larpcord: ${removed.join(" und ")} ist nur ein lokaler Larp-Name und wurde nicht an Discord gesendet.`, Toasts.Type.MESSAGE);
        return out as T;
    } catch (e) {
        logger.error("guardAccountBody", e);
        return body;
    }
}

// ---- Sofort neu rendern ----

/**
 * Discord-Komponenten rendern nur neu, wenn sich die Identität des User-Objekts ändert.
 * Deshalb wird das eigene User-Objekt im lokalen UserStore durch einen Klon ersetzt
 * (gleiche Daten, neue Identität). Es wird keine Flux-Aktion ausgelöst, also auch nichts gesendet.
 */
export function refreshOwnUser() {
    try {
        const id = fastSelfId();
        const users = UserStore.getUsers() as Record<string, any>;
        const user = id ? users?.[id] : undefined;
        if (!user || !("_larpUN" in user)) return;
        users[id!] = new user.constructor({ ...user });
        UserStore.emitChange();
        GuildMemberStore.emitChange();
    } catch (e) {
        logger.warn("Eigenes User-Objekt konnte nicht aktualisiert werden", e);
    }
}
