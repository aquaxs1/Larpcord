/*
 * Larpcord, a standalone Discord client for local cosmetic larping
 * Copyright (c) 2026 Larpcord contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// Writes the CHANGELOG.md section of a version to desktop/release-notes.md.
// It becomes the text of the GitHub release, and the auto-updater shows it as the changelog
// in the update notice.
// Usage: node scripts/release-notes.mjs v0.2.0   (or 0.2.0-beta.1)

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const version = (process.argv[2] || "").replace(/^v/, "");
if (!version) {
    console.error("Usage: node scripts/release-notes.mjs <version>");
    process.exit(1);
}

const changelog = readFileSync(join(ROOT, "CHANGELOG.md"), "utf8").replace(/\r\n/g, "\n");
const escaped = version.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
// Headings like "## [0.2.0] – 2026-09-19" or "## 0.2.0"
const heading = new RegExp(`^## \\[?v?${escaped}\\]?.*$`, "m");
const match = heading.exec(changelog);

let notes;
if (match) {
    const rest = changelog.slice(match.index + match[0].length);
    const next = rest.search(/^## /m);
    notes = (next === -1 ? rest : rest.slice(0, next)).trim();
}
if (!notes) {
    console.warn(`No section for ${version} found in CHANGELOG.md, the release gets a default text.`);
    notes = `Larpcord ${version}`;
}

writeFileSync(join(ROOT, "desktop", "release-notes.md"), notes + "\n");
console.log(`Release notes for ${version} written (${notes.length} characters)`);
