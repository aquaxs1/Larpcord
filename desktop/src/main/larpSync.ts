/*
 * Vesktop, a desktop app aiming to give you a snappier Discord Experience
 * Copyright (c) 2026 Vendicated and Vesktop contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { randomBytes } from "crypto";
import { net, safeStorage, shell } from "electron";
import { readFileSync } from "fs";
import { writeFile } from "fs/promises";
import { join } from "path";
import { IpcEvents } from "shared/IpcEvents";

import type {
    LarpSyncIndex,
    LarpSyncLoginResult,
    LarpSyncProfiles,
    LarpSyncResult,
    LarpSyncStatus
} from "../../../core/src/plugins/larpSync/types";
import { DATA_DIR } from "./constants";
import { handle } from "./utils/ipcWrappers";

/*
 * Larp sync (larpSync plugin): talks to the Larpcord sync server (see server/README.md).
 * All requests run here in the main process, so the Discord window's CSP stays closed.
 * Nothing in here talks to Discord: the login happens in the user's browser (OAuth2 "identify").
 */

/** Sync server built into this version. Empty = sync is off until a server URL is set in the hub. */
export const DEFAULT_SYNC_URL = "";

const FILE = join(DATA_DIR, "larpSync.json");
const LOGIN_TIMEOUT_MS = 5 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 15_000;
const MAX_PROFILE_BYTES = 256 * 1024;

interface Persisted {
    url?: string;
    userId?: string;
    /** Sync token, encrypted with safeStorage when available ("enc:" prefix), else plain ("raw:") */
    token?: string;
}

let data: Persisted = {};
try {
    data = JSON.parse(readFileSync(FILE, "utf8"));
} catch {}

function save() {
    writeFile(FILE, JSON.stringify(data)).catch(e => console.error("[larpSync] Failed to save", e));
}

function encodeToken(token: string) {
    try {
        if (safeStorage.isEncryptionAvailable()) return "enc:" + safeStorage.encryptString(token).toString("base64");
    } catch {}
    return "raw:" + token;
}

function decodeToken(): string | undefined {
    const v = data.token;
    if (!v) return undefined;
    try {
        if (v.startsWith("enc:")) return safeStorage.decryptString(Buffer.from(v.slice(4), "base64"));
        if (v.startsWith("raw:")) return v.slice(4);
    } catch (e) {
        console.error("[larpSync] Failed to read the sync token", e);
    }
    return undefined;
}

const serverUrl = () => (data.url ?? DEFAULT_SYNC_URL).replace(/\/+$/, "");

/** Only https, or http on localhost for testing */
function validUrl(url: string) {
    try {
        const u = new URL(url);
        return u.protocol === "https:" || (u.protocol === "http:" && ["localhost", "127.0.0.1"].includes(u.hostname));
    } catch {
        return false;
    }
}

let login: { state: string; cancelled: boolean } | undefined;

function status(): LarpSyncStatus {
    return {
        url: serverUrl(),
        defaultUrl: DEFAULT_SYNC_URL,
        userId: decodeToken() ? data.userId : undefined,
        loggingIn: !!login
    };
}

async function request<T>(
    method: string,
    path: string,
    { body, auth, headers }: { body?: string; auth?: boolean; headers?: Record<string, string> } = {}
): Promise<LarpSyncResult<{ status: number; json?: T; etag?: string }>> {
    const base = serverUrl();
    if (!base || !validUrl(base)) return { ok: false, error: "noServer" };
    const h: Record<string, string> = { ...headers };
    if (body) h["Content-Type"] = "application/json";
    if (auth) {
        const token = decodeToken();
        if (!token) return { ok: false, status: 401, error: "notLoggedIn" };
        h.Authorization = `Bearer ${token}`;
    }
    try {
        const res = await net.fetch(base + path, {
            method,
            body,
            headers: h,
            signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
        });
        if (res.status === 401 && auth) {
            // Token revoked or server reset: forget it, the hub shows "log in" again
            delete data.token;
            delete data.userId;
            save();
        }
        if (res.status >= 400)
            return {
                ok: false,
                status: res.status,
                error: (await res.json().catch(() => null))?.error ?? `HTTP ${res.status}`
            };
        const json = res.status === 204 || res.status === 304 ? undefined : ((await res.json()) as T);
        return { ok: true, value: { status: res.status, json, etag: res.headers.get("etag") ?? undefined } };
    } catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : "network" };
    }
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

async function startLogin(): Promise<LarpSyncLoginResult> {
    const base = serverUrl();
    if (!base || !validUrl(base)) return { ok: false, error: "noServer" };
    if (login) login.cancelled = true;
    const current = (login = { state: randomBytes(32).toString("base64url"), cancelled: false });

    try {
        await shell.openExternal(`${base}/v1/auth/start?state=${current.state}`);
        const until = Date.now() + LOGIN_TIMEOUT_MS;
        while (Date.now() < until) {
            await sleep(2000);
            if (current.cancelled) return { ok: false, error: "cancelled" };
            const res = await request<{ status: string; token?: string; userId?: string; error?: string }>(
                "GET",
                `/v1/auth/poll?state=${current.state}`
            );
            if (!res.ok) {
                // 404 before the browser reached the server is normal; keep polling
                if (res.status === 404) continue;
                if (res.status) return { ok: false, error: "failed" };
                continue;
            }
            const poll = res.value.json;
            if (poll?.status === "done" && poll.token && poll.userId) {
                data = { ...data, token: encodeToken(poll.token), userId: poll.userId };
                save();
                return { ok: true, userId: poll.userId };
            }
            if (poll?.status === "error")
                return {
                    ok: false,
                    error: poll.error === "banned" ? "banned" : poll.error === "denied" ? "denied" : "failed"
                };
        }
        return { ok: false, error: "timeout" };
    } finally {
        if (login === current) login = undefined;
    }
}

handle(IpcEvents.LARP_SYNC_STATUS, () => status());

handle(IpcEvents.LARP_SYNC_SET_URL, (_, url: unknown) => {
    const next = typeof url === "string" ? url.trim().replace(/\/+$/, "") : "";
    if (next && !validUrl(next)) return { ok: false, error: "invalidUrl" };
    if (next !== serverUrl()) {
        // Another server: the login belongs to the old one
        delete data.token;
        delete data.userId;
    }
    data.url = next === DEFAULT_SYNC_URL ? undefined : next;
    save();
    return { ok: true, value: status() };
});

handle(IpcEvents.LARP_SYNC_LOGIN, () => startLogin());

handle(IpcEvents.LARP_SYNC_CANCEL_LOGIN, () => {
    if (login) login.cancelled = true;
});

handle(IpcEvents.LARP_SYNC_LOGOUT, async () => {
    await request("POST", "/v1/auth/logout", { auth: true }).catch(() => {});
    delete data.token;
    delete data.userId;
    save();
    return status();
});

handle(IpcEvents.LARP_SYNC_PUT, async (_, profileJson: unknown): Promise<LarpSyncResult<number>> => {
    if (typeof profileJson !== "string" || Buffer.byteLength(profileJson) > MAX_PROFILE_BYTES)
        return { ok: false, error: "tooLarge" };
    const res = await request<{ version: number }>("PUT", "/v1/profile", { auth: true, body: profileJson });
    return res.ok ? { ok: true, value: res.value.json?.version ?? 0 } : res;
});

handle(IpcEvents.LARP_SYNC_DELETE, async (): Promise<LarpSyncResult> => {
    const res = await request("DELETE", "/v1/profile", { auth: true });
    return res.ok ? { ok: true, value: undefined } : res;
});

handle(IpcEvents.LARP_SYNC_INDEX, async (_, etag: unknown): Promise<LarpSyncResult<LarpSyncIndex>> => {
    const headers: Record<string, string> = typeof etag === "string" && etag ? { "If-None-Match": etag } : {};
    const res = await request<{ profiles: Record<string, number> }>("GET", "/v1/index", { headers });
    if (!res.ok) return res;
    return {
        ok: true,
        value: {
            profiles: res.value.status === 304 ? undefined : (res.value.json?.profiles ?? {}),
            etag: res.value.etag
        }
    };
});

handle(IpcEvents.LARP_SYNC_PROFILES, async (_, ids: unknown): Promise<LarpSyncResult<LarpSyncProfiles>> => {
    const list = Array.isArray(ids)
        ? ids.filter(id => typeof id === "string" && /^\d{15,21}$/.test(id)).slice(0, 50)
        : [];
    if (!list.length) return { ok: true, value: {} };
    const res = await request<{ profiles: LarpSyncProfiles }>("GET", `/v1/profiles?ids=${list.join(",")}`);
    return res.ok ? { ok: true, value: res.value.json?.profiles ?? {} } : res;
});
