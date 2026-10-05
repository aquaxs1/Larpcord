/*
 * Larpcord, a standalone Discord client for local cosmetic larping
 * Copyright (c) 2026 Larpcord contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

/** Shared between the core (larpSync plugin) and the desktop main process (desktop/src/main/larpSync.ts) */

export interface LarpSyncStatus {
    /** Server URL in use ("" = no server configured) */
    url: string;
    /** URL built into this Larpcord version */
    defaultUrl: string;
    /** Discord user ID of the sync login, undefined = not logged in */
    userId?: string;
    loggingIn: boolean;
}

export type LarpSyncLoginResult = { ok: true; userId: string; } | { ok: false; error: "noServer" | "cancelled" | "timeout" | "denied" | "banned" | "failed" | "network"; };

export type LarpSyncResult<T = undefined> = { ok: true; value: T; } | { ok: false; status?: number; error: string; };

export interface LarpSyncIndex {
    /** undefined when the server answered 304 (nothing changed since etag) */
    profiles?: Record<string, number>;
    etag?: string;
}

/** userId → shared profile (opaque, sanitized by the core) or null */
export type LarpSyncProfiles = Record<string, { version: number; profile: unknown; } | null>;
