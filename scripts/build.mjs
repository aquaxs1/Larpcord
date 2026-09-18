/*
 * Larpcord – baut den Core (Vencord-Fork) und kopiert ihn in die Desktop-App (Vesktop-Fork).
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 *   node scripts/build.mjs          Release-Build
 *   node scripts/build.mjs --dev    Dev-Build (Vencord-Dev-Tools, Source-Maps)
 */
import { execSync } from "child_process";
import { copyFileSync, existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from "fs";
import { join } from "path";

const root = join(import.meta.dirname, "..");
const dev = process.argv.includes("--dev");

function gitHash() {
    try {
        return execSync("git rev-parse --short HEAD", { cwd: root, encoding: "utf-8" }).trim();
    } catch {
        return "unknown";
    }
}

const env = {
    ...process.env,
    // core/ hat kein eigenes .git mehr, daher Hash und Remote explizit setzen
    VENCORD_HASH: process.env.VENCORD_HASH || gitHash(),
    VENCORD_REMOTE: process.env.VENCORD_REMOTE || "larpcord/larpcord"
};

const run = (cmd, cwd) => {
    console.log(`\n> [${cwd}] ${cmd}`);
    execSync(cmd, { cwd: join(root, cwd), stdio: "inherit", env });
};

// 1. Core bauen. Der Vencord-Updater bleibt aus: Updates kommen nur über Larpcord-Releases.
run(`pnpm build --disable-updater${dev ? " --dev" : ""}`, "core");

// 2. Core-Artefakte nach desktop/vencord kopieren (wird per extraResources in die .exe gepackt)
const coreDist = join(root, "core", "dist");
const target = join(root, "desktop", "vencord");
rmSync(target, { recursive: true, force: true });
mkdirSync(target, { recursive: true });

const files = readdirSync(coreDist).filter(f =>
    f.startsWith("vencordDesktop") && (/\.(js|css)$/.test(f) || (dev && f.endsWith(".map")))
);
for (const f of ["vencordDesktopMain.js", "vencordDesktopPreload.js", "vencordDesktopRenderer.js", "vencordDesktopRenderer.css"]) {
    if (!files.includes(f)) throw new Error(`Core-Build unvollständig, ${f} fehlt in core/dist`);
}
for (const f of files) copyFileSync(join(coreDist, f), join(target, f));
// leeres package.json, damit Node die Dateien als CommonJS lädt (wie bei Vesktop üblich)
writeFileSync(join(target, "package.json"), "{}");
console.log(`\nCore → desktop/vencord (${files.length} Dateien)`);

// 3. Desktop bauen
run(dev ? "pnpm build --dev" : "pnpm build", "desktop");

if (!existsSync(join(root, "desktop", "dist", "js", "main.js"))) throw new Error("Desktop-Build fehlgeschlagen");
console.log("\n✅ Larpcord gebaut");
