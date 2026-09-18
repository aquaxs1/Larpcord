/*
 * Larpcord – installiert die Abhängigkeiten von core/ (Vencord) und desktop/ (Vesktop).
 * SPDX-License-Identifier: GPL-3.0-or-later
 */
import { execSync } from "child_process";
import { existsSync } from "fs";
import { join } from "path";

const root = join(import.meta.dirname, "..");
const run = (cmd, cwd) => execSync(cmd, { cwd: join(root, cwd), stdio: "inherit" });

run("pnpm install --frozen-lockfile", "core");
run("pnpm install --frozen-lockfile", "desktop");

// pnpm überspringt Electrons Postinstall gelegentlich (Build-Cache) → Binary notfalls selbst holen
const electronDir = join(root, "desktop", "node_modules", "electron");
if (!existsSync(join(electronDir, "path.txt"))) run("node install.js", "desktop/node_modules/electron");
