/*
 * Larpcord mobile – builds the core (Vencord fork) for the web and wraps the userscript into
 * larpcord-inject.js, which the Android and iOS apps inject into discord.com at document start.
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 *   node scripts/build-inject.mjs            build core, then write the inject script
 *   node scripts/build-inject.mjs --no-core  reuse an existing core/dist/Vencord.user.js
 */
import { execSync } from "child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";

const mobile = join(import.meta.dirname, "..");
const root = join(mobile, "..");
const core = join(root, "core");

function gitHash() {
    try {
        return execSync("git rev-parse --short HEAD", { cwd: root, encoding: "utf-8" }).trim();
    } catch {
        return "unknown";
    }
}

if (!process.argv.includes("--no-core")) {
    execSync("pnpm buildWeb", {
        cwd: core,
        stdio: "inherit",
        env: {
            ...process.env,
            VENCORD_HASH: process.env.VENCORD_HASH || gitHash(),
            VENCORD_REMOTE: process.env.VENCORD_REMOTE || "aquaxs1/Larpcord"
        }
    });
}

const userscriptPath = join(core, "dist", "Vencord.user.js");
if (!existsSync(userscriptPath)) throw new Error("core/dist/Vencord.user.js missing – run the core web build first");

const userscript = readFileSync(userscriptPath, "utf-8");
const prelude = readFileSync(join(mobile, "scripts", "prelude.js"), "utf-8");

// The userscript expects the Tampermonkey globals unsafeWindow and GM_xmlhttpRequest; the prelude provides both
// inside the same function scope, so nothing leaks onto Discord's window except what Vencord itself defines.
const inject = `${prelude}
if (window.__larpcordMobile && window.__larpcordMobile.run) (function (unsafeWindow, GM_xmlhttpRequest) {
${userscript}
})(window, window.__larpcordMobile.xhr);
`;

// "cap sync" copies www/ into both apps (Android: assets/public, iOS: App/public)
const target = join(mobile, "www", "larpcord-inject.js");
mkdirSync(dirname(target), { recursive: true });
writeFileSync(target, inject);
console.log(`Inject script → ${target} (${(inject.length / 1048576).toFixed(1)} MB)`);
