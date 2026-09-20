/*
 * Larpcord, a standalone Discord client for local cosmetic larping
 * Copyright (c) 2026 Larpcord contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// esbuild-Plugin für das virtuelle Modul "~larpcord-locales".
// Es bündelt jede *.json aus dem Sprachordner automatisch, eine neue Sprache braucht also nur eine neue Datei.
// Genutzt vom Core-Build (common.mjs), vom Desktop-Build (desktop/scripts/build/build.mts) und von scripts/i18n/check.mjs.

import { readdir } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const LOCALES_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "../../src/plugins/larpCore/i18n/locales");

export async function listLocaleFiles() {
    return (await readdir(LOCALES_DIR)).filter(f => f.endsWith(".json")).sort();
}

/** @type {import("esbuild").Plugin} */
export const larpLocalesPlugin = {
    name: "larpcord-locales",
    setup(build) {
        const filter = /^~larpcord-locales$/;

        build.onResolve({ filter }, args => ({ namespace: "larpcord-locales", path: args.path }));

        build.onLoad({ filter, namespace: "larpcord-locales" }, async () => {
            const files = await listLocaleFiles();
            let code = "";
            let entries = "";
            files.forEach((file, i) => {
                code += `import l${i} from ${JSON.stringify(join(LOCALES_DIR, file).replaceAll("\\", "/"))};\n`;
                entries += `${JSON.stringify(file.slice(0, -".json".length))}: l${i},\n`;
            });
            code += `export default {\n${entries}};\n`;

            return {
                contents: code,
                resolveDir: LOCALES_DIR,
                watchDirs: [LOCALES_DIR],
                watchFiles: files.map(f => join(LOCALES_DIR, f))
            };
        });
    }
};
