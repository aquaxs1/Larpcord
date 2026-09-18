/*
 * Larpcord – setzt die App-Version in desktop/package.json (z. B. aus einem Git-Tag "v1.2.3").
 * SPDX-License-Identifier: GPL-3.0-or-later
 */
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

const version = (process.argv[2] ?? "").replace(/^v/, "");
if (!/^\d+\.\d+\.\d+([-+][\w.-]+)?$/.test(version)) {
    console.error(`Ungültige Version: "${process.argv[2]}"`);
    process.exit(1);
}

const file = join(import.meta.dirname, "..", "desktop", "package.json");
const pkg = JSON.parse(readFileSync(file, "utf-8"));
pkg.version = version;
writeFileSync(file, JSON.stringify(pkg, null, 4) + "\n");
console.log(`desktop/package.json → ${version}`);
