/*
 * Larpcord – builds the core (Vencord fork) and copies it into the desktop app (Vesktop fork).
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 *   node scripts/build.mjs          release build
 *   node scripts/build.mjs --dev    dev build (Vencord dev tools, source maps)
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
    // core/ has no .git of its own anymore, so set hash and remote explicitly
    VENCORD_HASH: process.env.VENCORD_HASH || gitHash(),
    VENCORD_REMOTE: process.env.VENCORD_REMOTE || "aquaxs1/Larpcord"
};

const run = (cmd, cwd) => {
    console.log(`\n> [${cwd}] ${cmd}`);
    execSync(cmd, { cwd: join(root, cwd), stdio: "inherit", env });
};

// 1. Build the core. The Vencord updater stays off: updates only come via Larpcord releases.
run(`pnpm build --disable-updater${dev ? " --dev" : ""}`, "core");

// 2. Copy core artifacts to desktop/vencord (packed into the .exe via extraResources)
const coreDist = join(root, "core", "dist");
const target = join(root, "desktop", "vencord");
rmSync(target, { recursive: true, force: true });
mkdirSync(target, { recursive: true });

const files = readdirSync(coreDist).filter(f =>
    f.startsWith("vencordDesktop") && (/\.(js|css)$/.test(f) || (dev && f.endsWith(".map")))
);
for (const f of ["vencordDesktopMain.js", "vencordDesktopPreload.js", "vencordDesktopRenderer.js", "vencordDesktopRenderer.css"]) {
    if (!files.includes(f)) throw new Error(`Core build incomplete, ${f} missing in core/dist`);
}
for (const f of files) copyFileSync(join(coreDist, f), join(target, f));
// empty package.json so Node loads the files as CommonJS (as usual with Vesktop)
writeFileSync(join(target, "package.json"), "{}");
console.log(`\nCore → desktop/vencord (${files.length} files)`);

// 3. Build desktop
run(dev ? "pnpm build --dev" : "pnpm build", "desktop");

if (!existsSync(join(root, "desktop", "dist", "js", "main.js"))) throw new Error("Desktop build failed");
console.log("\n✅ Larpcord built");
