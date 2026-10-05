/*
 * Larpcord sync server
 * Copyright (c) 2026 Larpcord contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { createServer as createHttpServer } from "node:http";

import { openDatabase } from "./db.mjs";

/*
 * Larpcord sync: lets Larpcord users see each other's larp profiles.
 *
 * - Login: Discord OAuth2 with the read-only "identify" scope, in the user's browser. The client picks a random
 *   `state`, opens /v1/auth/start?state=…, and polls /v1/auth/poll?state=… until the login is done. The client's
 *   Discord token is never sent here.
 * - Profiles are stored as opaque JSON (size and shape checked). Every client sanitizes received profiles again.
 * - No dependencies besides Node 22 (node:http, node:sqlite).
 */

const MAX_PROFILE_BYTES = 256 * 1024;
const MAX_IDS_PER_REQUEST = 50;
const LOGIN_TTL_MS = 10 * 60 * 1000;
/** Top-level keys a shared profile may have (see core/src/plugins/larpCore/shared.ts) */
const PROFILE_KEYS = new Set([
    "format", "badges", "badgeOrder", "memberSince", "clanTag", "nitro", "profile", "decoration", "profileEffect",
    "nameplate", "nameplateData", "nameStyle", "extras", "names", "activities", "connections"
]);
const SNOWFLAKE = /^\d{15,21}$/;
const STATE = /^[A-Za-z0-9_-]{32,128}$/;

export function loadConfig(env = process.env) {
    return {
        port: Number(env.PORT ?? 8080),
        host: env.HOST ?? "0.0.0.0",
        database: env.DATABASE ?? "./data/larpcord-sync.db",
        publicUrl: (env.PUBLIC_URL ?? `http://localhost:${env.PORT ?? 8080}`).replace(/\/+$/, ""),
        clientId: env.DISCORD_CLIENT_ID ?? "",
        clientSecret: env.DISCORD_CLIENT_SECRET ?? "",
        adminKey: env.ADMIN_KEY ?? "",
        trustProxy: env.TRUST_PROXY === "1",
        discordApi: (env.DISCORD_API ?? "https://discord.com/api/v10").replace(/\/+$/, ""),
        discordAuthorize: env.DISCORD_AUTHORIZE_URL ?? "https://discord.com/oauth2/authorize"
    };
}

const sha256 = s => createHash("sha256").update(s).digest("hex");

function safeEqual(a, b) {
    const x = Buffer.from(String(a)), y = Buffer.from(String(b));
    return x.length === y.length && timingSafeEqual(x, y);
}

/** Simple fixed-window rate limiter (in memory, per key) */
function rateLimiter(limit, windowMs) {
    const hits = new Map();
    setInterval(() => hits.clear(), windowMs).unref();
    return key => {
        const n = (hits.get(key) ?? 0) + 1;
        hits.set(key, n);
        return n <= limit;
    };
}

function send(res, status, body, headers = {}) {
    const json = body === undefined ? "" : JSON.stringify(body);
    res.writeHead(status, {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
        ...headers
    });
    res.end(json);
}

function sendHtml(res, status, title, text) {
    const esc = s => String(s).replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);
    res.writeHead(status, {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
        "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'",
        "X-Content-Type-Options": "nosniff"
    });
    res.end(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#1e1f22;color:#dbdee1;font:16px system-ui,sans-serif}
main{max-width:420px;padding:32px;border-radius:12px;background:#2b2d31;text-align:center}h1{margin:0 0 12px;font-size:22px;color:#fff}</style>
</head><body><main><h1>${esc(title)}</h1><p>${esc(text)}</p></main></body></html>`);
}

function readBody(req, limit) {
    return new Promise((resolve, reject) => {
        let size = 0;
        let tooLarge = Number(req.headers["content-length"] ?? 0) > limit;
        const chunks = [];
        req.on("data", c => {
            size += c.length;
            if (size > limit) tooLarge = true;
            // Keep draining so the client gets the 413 instead of a reset connection
            if (!tooLarge) chunks.push(c);
        });
        req.on("end", () => tooLarge
            ? reject(Object.assign(new Error("too large"), { status: 413 }))
            : resolve(Buffer.concat(chunks).toString("utf8")));
        req.on("error", reject);
    });
}

/** Shape check only. The real validation (URLs, lengths, enums) happens in every client. */
function checkProfile(value) {
    if (value == null || typeof value !== "object" || Array.isArray(value)) return "Profile must be an object";
    for (const key of Object.keys(value)) {
        if (!PROFILE_KEYS.has(key)) return `Unknown field: ${key}`;
    }
    return null;
}

export function createSyncServer(config = loadConfig(), { fetch: fetchImpl = globalThis.fetch } = {}) {
    const db = openDatabase(config.database);
    /** state → { created, token?, userId?, error? } */
    const logins = new Map();
    const limitIp = rateLimiter(240, 60_000);
    const limitWrite = rateLimiter(30, 60_000);
    const limitLogin = rateLimiter(20, 60_000);

    const cleanup = setInterval(() => {
        const now = Date.now();
        for (const [state, login] of logins) if (now - login.created > LOGIN_TTL_MS) logins.delete(state);
    }, 60_000);
    cleanup.unref();

    const clientIp = req => (config.trustProxy && String(req.headers["x-forwarded-for"] ?? "").split(",")[0].trim()) || req.socket.remoteAddress || "?";

    function authUser(req) {
        const m = /^Bearer ([A-Za-z0-9_-]{20,200})$/.exec(req.headers.authorization ?? "");
        if (!m) return undefined;
        return { userId: db.userForToken(sha256(m[1])), hash: sha256(m[1]) };
    }

    async function finishLogin(code) {
        const tokenRes = await fetchImpl(`${config.discordApi}/oauth2/token`, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                grant_type: "authorization_code",
                code,
                redirect_uri: `${config.publicUrl}/v1/auth/callback`,
                client_id: config.clientId,
                client_secret: config.clientSecret
            })
        });
        if (!tokenRes.ok) throw new Error(`token exchange failed (${tokenRes.status})`);
        const { access_token: accessToken } = await tokenRes.json();
        const meRes = await fetchImpl(`${config.discordApi}/users/@me`, { headers: { Authorization: `Bearer ${accessToken}` } });
        if (!meRes.ok) throw new Error(`identify failed (${meRes.status})`);
        const me = await meRes.json();
        if (!SNOWFLAKE.test(String(me.id))) throw new Error("invalid user id");
        // Revoking the Discord token right away: it's only needed to learn the user ID
        fetchImpl(`${config.discordApi}/oauth2/token/revoke`, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({ token: accessToken, client_id: config.clientId, client_secret: config.clientSecret })
        }).catch(() => { });
        return String(me.id);
    }

    async function handle(req, res) {
        const url = new URL(req.url ?? "/", "http://local");
        const path = url.pathname;
        const ip = clientIp(req);
        if (!limitIp(ip)) return send(res, 429, { error: "Too many requests" });

        if (req.method === "GET" && path === "/v1/health") return send(res, 200, { ok: true });

        // ---- Login ----
        if (req.method === "GET" && path === "/v1/auth/start") {
            const state = url.searchParams.get("state") ?? "";
            if (!STATE.test(state)) return sendHtml(res, 400, "Larpcord sync", "Invalid login link. Start the login from Larpcord again.");
            if (!config.clientId) return sendHtml(res, 503, "Larpcord sync", "Login is not configured on this server.");
            if (!limitLogin(ip)) return sendHtml(res, 429, "Larpcord sync", "Too many login attempts, try again in a minute.");
            if (!logins.has(state)) logins.set(state, { created: Date.now() });
            const target = new URL(config.discordAuthorize);
            target.search = new URLSearchParams({
                client_id: config.clientId,
                response_type: "code",
                redirect_uri: `${config.publicUrl}/v1/auth/callback`,
                scope: "identify",
                state,
                prompt: "none"
            }).toString();
            res.writeHead(302, { Location: target.toString(), "Cache-Control": "no-store" });
            return res.end();
        }

        if (req.method === "GET" && path === "/v1/auth/callback") {
            const state = url.searchParams.get("state") ?? "";
            const code = url.searchParams.get("code") ?? "";
            const login = logins.get(state);
            if (!login || login.token || login.error) return sendHtml(res, 400, "Larpcord sync", "This login expired. Start it from Larpcord again.");
            if (!code) {
                login.error = "denied";
                return sendHtml(res, 400, "Larpcord sync", "Login was cancelled. You can close this tab.");
            }
            try {
                const userId = await finishLogin(code);
                if (db.isBanned(userId)) {
                    login.error = "banned";
                    return sendHtml(res, 403, "Larpcord sync", "This account can't use Larpcord sync.");
                }
                const token = randomBytes(32).toString("base64url");
                db.addToken(sha256(token), userId);
                login.token = token;
                login.userId = userId;
                return sendHtml(res, 200, "Logged in", "You're logged in to Larpcord sync. You can close this tab and go back to Larpcord.");
            } catch (e) {
                console.error("[auth]", e.message);
                login.error = "failed";
                return sendHtml(res, 502, "Larpcord sync", "Login failed. Try again from Larpcord.");
            }
        }

        if (req.method === "GET" && path === "/v1/auth/poll") {
            const state = url.searchParams.get("state") ?? "";
            const login = logins.get(state);
            if (!STATE.test(state) || !login) return send(res, 404, { status: "unknown" });
            if (login.error) {
                logins.delete(state);
                return send(res, 200, { status: "error", error: login.error });
            }
            if (!login.token) return send(res, 200, { status: "pending" });
            logins.delete(state);
            return send(res, 200, { status: "done", token: login.token, userId: login.userId });
        }

        if (req.method === "POST" && path === "/v1/auth/logout") {
            const auth = authUser(req);
            if (auth?.userId) db.deleteToken(auth.hash);
            return send(res, 204);
        }

        // ---- Own profile ----
        if (path === "/v1/profile" && (req.method === "PUT" || req.method === "DELETE" || req.method === "GET")) {
            const auth = authUser(req);
            if (!auth?.userId) return send(res, 401, { error: "Not logged in" });
            const { userId } = auth;

            if (req.method === "GET") {
                const row = db.getProfile(userId);
                return send(res, 200, { userId, shared: !!row, version: row?.version ?? null });
            }
            if (!limitWrite(userId)) return send(res, 429, { error: "Too many updates" });
            if (req.method === "DELETE") {
                db.deleteProfile(userId);
                return send(res, 204);
            }
            if (db.isBanned(userId)) return send(res, 403, { error: "Sharing is disabled for this account" });

            let raw;
            try {
                raw = await readBody(req, MAX_PROFILE_BYTES);
            } catch (e) {
                return send(res, e.status ?? 400, { error: e.status === 413 ? "Profile too large" : "Bad request" });
            }
            let profile;
            try {
                profile = JSON.parse(raw);
            } catch {
                return send(res, 400, { error: "Invalid JSON" });
            }
            const problem = checkProfile(profile);
            if (problem) return send(res, 400, { error: problem });
            const version = db.putProfile(userId, JSON.stringify(profile));
            return send(res, 200, { version });
        }

        // ---- Other users' profiles ----
        if (req.method === "GET" && path === "/v1/index") {
            const tag = db.indexTag();
            if (req.headers["if-none-match"] === tag) {
                res.writeHead(304, { ETag: tag, "Cache-Control": "no-cache" });
                return res.end();
            }
            const profiles = {};
            for (const row of db.index()) profiles[row.user_id] = row.version;
            return send(res, 200, { profiles }, { ETag: tag, "Cache-Control": "no-cache" });
        }

        if (req.method === "GET" && path === "/v1/profiles") {
            const ids = [...new Set((url.searchParams.get("ids") ?? "").split(",").filter(id => SNOWFLAKE.test(id)))];
            if (!ids.length || ids.length > MAX_IDS_PER_REQUEST) return send(res, 400, { error: `Pass 1 to ${MAX_IDS_PER_REQUEST} user IDs` });
            const profiles = {};
            for (const id of ids) {
                const row = db.getProfile(id);
                profiles[id] = row ? { version: row.version, profile: JSON.parse(row.data) } : null;
            }
            return send(res, 200, { profiles });
        }

        // ---- Admin (moderation) ----
        const admin = /^\/v1\/admin\/(profile|ban)\/(\d{15,21})$/.exec(path);
        if (admin) {
            if (!config.adminKey || !safeEqual(req.headers["x-admin-key"] ?? "", config.adminKey)) return send(res, 403, { error: "Forbidden" });
            const [, kind, userId] = admin;
            if (kind === "profile" && req.method === "DELETE") {
                return send(res, 200, { deleted: db.deleteProfile(userId) });
            }
            if (kind === "ban" && req.method === "PUT") {
                db.ban(userId, url.searchParams.get("reason") ?? undefined);
                return send(res, 200, { banned: true });
            }
            if (kind === "ban" && req.method === "DELETE") {
                db.unban(userId);
                return send(res, 200, { banned: false });
            }
        }

        return send(res, 404, { error: "Not found" });
    }

    const server = createHttpServer((req, res) => {
        handle(req, res).catch(e => {
            console.error("[server]", e);
            if (!res.headersSent) send(res, 500, { error: "Internal error" });
            else res.end();
        });
    });
    server.on("close", () => {
        clearInterval(cleanup);
        db.close();
    });
    return server;
}

// Started directly: node src/server.mjs
if (import.meta.url === `file://${process.argv[1]}`) {
    const config = loadConfig();
    if (!config.clientId || !config.clientSecret) console.warn("DISCORD_CLIENT_ID / DISCORD_CLIENT_SECRET missing: login is disabled");
    createSyncServer(config).listen(config.port, config.host, () => {
        console.log(`Larpcord sync server on ${config.host}:${config.port} (public URL ${config.publicUrl})`);
    });
}
