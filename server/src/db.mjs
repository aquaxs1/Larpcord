/*
 * Larpcord sync server
 * Copyright (c) 2026 Larpcord contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";

/**
 * SQLite storage (built into Node 22, no native dependencies).
 * - tokens:   sync tokens (only their SHA-256 hash is stored) → Discord user ID
 * - profiles: shared larp profile per user ID (opaque JSON, validated again by every client)
 * - bans:     users that may no longer share a profile
 */
export function openDatabase(path) {
    if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
    const db = new DatabaseSync(path);
    db.exec(`
        PRAGMA journal_mode = WAL;
        CREATE TABLE IF NOT EXISTS tokens (
            hash TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            created INTEGER NOT NULL
        );
        CREATE INDEX IF NOT EXISTS tokens_user ON tokens(user_id);
        CREATE TABLE IF NOT EXISTS profiles (
            user_id TEXT PRIMARY KEY,
            data TEXT NOT NULL,
            version INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS bans (
            user_id TEXT PRIMARY KEY,
            reason TEXT,
            created INTEGER NOT NULL
        );
    `);

    const q = {
        addToken: db.prepare("INSERT INTO tokens (hash, user_id, created) VALUES (?, ?, ?)"),
        userForToken: db.prepare("SELECT user_id FROM tokens WHERE hash = ?"),
        deleteToken: db.prepare("DELETE FROM tokens WHERE hash = ?"),
        countTokens: db.prepare("SELECT COUNT(*) AS n FROM tokens WHERE user_id = ?"),
        oldestTokens: db.prepare("DELETE FROM tokens WHERE hash IN (SELECT hash FROM tokens WHERE user_id = ? ORDER BY created ASC LIMIT ?)"),
        putProfile: db.prepare("INSERT INTO profiles (user_id, data, version) VALUES (?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET data = excluded.data, version = excluded.version"),
        deleteProfile: db.prepare("DELETE FROM profiles WHERE user_id = ?"),
        getProfile: db.prepare("SELECT data, version FROM profiles WHERE user_id = ?"),
        index: db.prepare("SELECT user_id, version FROM profiles"),
        maxVersion: db.prepare("SELECT COALESCE(MAX(version), 0) AS v, COUNT(*) AS n FROM profiles"),
        ban: db.prepare("INSERT OR REPLACE INTO bans (user_id, reason, created) VALUES (?, ?, ?)"),
        unban: db.prepare("DELETE FROM bans WHERE user_id = ?"),
        isBanned: db.prepare("SELECT 1 FROM bans WHERE user_id = ?")
    };

    /** Keep at most this many sync tokens per user (one per device / login) */
    const MAX_TOKENS_PER_USER = 10;

    return {
        addToken(hash, userId) {
            q.addToken.run(hash, userId, Date.now());
            const { n } = q.countTokens.get(userId);
            if (n > MAX_TOKENS_PER_USER) q.oldestTokens.run(userId, n - MAX_TOKENS_PER_USER);
        },
        userForToken(hash) {
            return q.userForToken.get(hash)?.user_id;
        },
        deleteToken(hash) {
            q.deleteToken.run(hash);
        },
        /** Returns the new version. Versions only ever grow, even for updates within the same millisecond. */
        putProfile(userId, data) {
            const { v } = q.maxVersion.get();
            const version = Math.max(Date.now(), v + 1);
            q.putProfile.run(userId, data, version);
            return version;
        },
        deleteProfile(userId) {
            return q.deleteProfile.run(userId).changes > 0;
        },
        getProfile(userId) {
            return q.getProfile.get(userId);
        },
        index() {
            return q.index.all();
        },
        /** Changes whenever any profile is added, updated or removed (used as ETag) */
        indexTag() {
            const { v, n } = q.maxVersion.get();
            return `"${v}-${n}"`;
        },
        ban(userId, reason) {
            q.ban.run(userId, reason ?? null, Date.now());
            q.deleteProfile.run(userId);
        },
        unban(userId) {
            q.unban.run(userId);
        },
        isBanned(userId) {
            return !!q.isBanned.get(userId);
        },
        close() {
            db.close();
        }
    };
}
