/*
 * Larpcord, a standalone Discord client for local cosmetic larping
 * Copyright (c) 2026 Larpcord contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// Schreibt den CHANGELOG.md-Abschnitt einer Version nach desktop/release-notes.md.
// electron-builder nimmt diese Datei beim Veröffentlichen als Text des GitHub-Releases,
// und der Auto-Updater zeigt ihn als Changelog im Update-Hinweis.
// Aufruf: node scripts/release-notes.mjs v0.2.0   (oder 0.2.0-beta.1)

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const version = (process.argv[2] || "").replace(/^v/, "");
if (!version) {
    console.error("Aufruf: node scripts/release-notes.mjs <version>");
    process.exit(1);
}

const changelog = readFileSync(join(ROOT, "CHANGELOG.md"), "utf8").replace(/\r\n/g, "\n");
const escaped = version.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
// Überschriften wie "## [0.2.0] – 2026-09-19" oder "## 0.2.0"
const heading = new RegExp(`^## \\[?v?${escaped}\\]?.*$`, "m");
const match = heading.exec(changelog);

let notes;
if (match) {
    const rest = changelog.slice(match.index + match[0].length);
    const next = rest.search(/^## /m);
    notes = (next === -1 ? rest : rest.slice(0, next)).trim();
}
if (!notes) {
    console.warn(`Kein Abschnitt für ${version} in CHANGELOG.md gefunden, Release bekommt einen Standardtext.`);
    notes = `Larpcord ${version}`;
}

writeFileSync(join(ROOT, "desktop", "release-notes.md"), notes + "\n");
console.log(`Release-Notes für ${version} geschrieben (${notes.length} Zeichen)`);
