/*
 * Larpcord sync server
 * Copyright (c) 2026 Larpcord contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import assert from "node:assert/strict";
import { after, before, test } from "node:test";

import { createSyncServer, loadConfig } from "../src/server.mjs";

const USER = "123456789012345678";
let server, base;
const discordCalls = [];

/** Fake Discord API: every code logs in as USER, except "banned" */
async function fakeFetch(url, init) {
    discordCalls.push(String(url));
    if (String(url).endsWith("/oauth2/token")) {
        const code = new URLSearchParams(String(init.body)).get("code");
        return Response.json({ access_token: `at-${code}` });
    }
    if (String(url).endsWith("/users/@me")) {
        const auth = init.headers.Authorization;
        return Response.json({ id: auth === "Bearer at-banned" ? "999999999999999999" : USER });
    }
    return new Response(null, { status: 200 });
}

before(async () => {
    const config = { ...loadConfig({}), database: ":memory:", clientId: "cid", clientSecret: "secret", adminKey: "adm", publicUrl: "https://sync.test" };
    server = createSyncServer(config, { fetch: fakeFetch });
    await new Promise(r => server.listen(0, "127.0.0.1", r));
    base = `http://127.0.0.1:${server.address().port}`;
});
after(() => server.close());

const STATE = "a".repeat(40);

async function login(state = STATE, code = "ok") {
    const start = await fetch(`${base}/v1/auth/start?state=${state}`, { redirect: "manual" });
    assert.equal(start.status, 302);
    const location = new URL(start.headers.get("location"));
    assert.equal(location.searchParams.get("scope"), "identify");
    assert.equal(location.searchParams.get("redirect_uri"), "https://sync.test/v1/auth/callback");
    assert.equal((await (await fetch(`${base}/v1/auth/poll?state=${state}`)).json()).status, "pending");
    const cb = await fetch(`${base}/v1/auth/callback?state=${state}&code=${code}`);
    return { cb, poll: await (await fetch(`${base}/v1/auth/poll?state=${state}`)).json() };
}

test("login via OAuth hands the token to the polling client once", async () => {
    const { cb, poll } = await login();
    assert.equal(cb.status, 200);
    assert.equal(poll.status, "done");
    assert.equal(poll.userId, USER);
    assert.ok(poll.token.length > 20);
    // Second poll: gone
    assert.equal((await fetch(`${base}/v1/auth/poll?state=${STATE}`)).status, 404);
    // Discord token is revoked after identify
    assert.ok(discordCalls.some(u => u.endsWith("/oauth2/token/revoke")));
});

test("invalid state and unknown callbacks are rejected", async () => {
    assert.equal((await fetch(`${base}/v1/auth/start?state=short`, { redirect: "manual" })).status, 400);
    assert.equal((await fetch(`${base}/v1/auth/callback?state=${"b".repeat(40)}&code=x`)).status, 400);
});

test("share, index, fetch, delete", async () => {
    const { poll } = await login("c".repeat(40));
    const auth = { Authorization: `Bearer ${poll.token}` };

    assert.equal((await fetch(`${base}/v1/profile`, { method: "PUT", body: "{}" })).status, 401);
    assert.equal((await fetch(`${base}/v1/profile`, { method: "PUT", headers: auth, body: "nope" })).status, 400);
    assert.equal((await fetch(`${base}/v1/profile`, { method: "PUT", headers: auth, body: JSON.stringify({ evil: 1 }) })).status, 400);
    assert.equal((await fetch(`${base}/v1/profile`, { method: "PUT", headers: auth, body: JSON.stringify({ badges: "x".repeat(300_000) }) })).status, 413);

    const put = await fetch(`${base}/v1/profile`, { method: "PUT", headers: auth, body: JSON.stringify({ format: 1, names: { displayName: "Larp" } }) });
    assert.equal(put.status, 200);
    const { version } = await put.json();

    const index = await fetch(`${base}/v1/index`);
    const etag = index.headers.get("etag");
    assert.deepEqual((await index.json()).profiles, { [USER]: version });
    assert.equal((await fetch(`${base}/v1/index`, { headers: { "If-None-Match": etag } })).status, 304);

    const got = await (await fetch(`${base}/v1/profiles?ids=${USER},111111111111111111`)).json();
    assert.deepEqual(got.profiles[USER].profile.names, { displayName: "Larp" });
    assert.equal(got.profiles["111111111111111111"], null);
    assert.equal((await fetch(`${base}/v1/profiles?ids=abc`)).status, 400);

    assert.equal((await fetch(`${base}/v1/profile`, { method: "DELETE", headers: auth })).status, 204);
    assert.deepEqual((await (await fetch(`${base}/v1/index`)).json()).profiles, {});
    assert.notEqual((await fetch(`${base}/v1/index`, { headers: { "If-None-Match": etag } })).status, 304);

    await fetch(`${base}/v1/auth/logout`, { method: "POST", headers: auth });
    assert.equal((await fetch(`${base}/v1/profile`, { headers: auth })).status, 401);
});

test("admin can remove and ban, banned users can't log in or share", async () => {
    const { poll } = await login("d".repeat(40));
    const auth = { Authorization: `Bearer ${poll.token}` };
    await fetch(`${base}/v1/profile`, { method: "PUT", headers: auth, body: JSON.stringify({ format: 1 }) });

    assert.equal((await fetch(`${base}/v1/admin/ban/${USER}`, { method: "PUT" })).status, 403);
    assert.equal((await fetch(`${base}/v1/admin/ban/${USER}`, { method: "PUT", headers: { "X-Admin-Key": "adm" } })).status, 200);
    assert.deepEqual((await (await fetch(`${base}/v1/index`)).json()).profiles, {});
    assert.equal((await fetch(`${base}/v1/profile`, { method: "PUT", headers: auth, body: JSON.stringify({ format: 1 }) })).status, 403);
    await fetch(`${base}/v1/admin/ban/${USER}`, { method: "DELETE", headers: { "X-Admin-Key": "adm" } });

    const banned = await login("e".repeat(40), "banned");
    await fetch(`${base}/v1/admin/ban/999999999999999999`, { method: "PUT", headers: { "X-Admin-Key": "adm" } });
    assert.equal(banned.poll.status, "done");
    const again = await login("f".repeat(40), "banned");
    assert.equal(again.cb.status, 403);
    assert.equal(again.poll.status, "error");
});
