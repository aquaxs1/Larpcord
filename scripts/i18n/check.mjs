/*
 * Larpcord, a standalone Discord client for local cosmetic larping
 * Copyright (c) 2026 Larpcord contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// pnpm i18n:check
// Checks all language files against en.json (reference) and the source code:
//  - missing keys per language (error)
//  - unused keys per language that don't exist in en.json (error)
//  - keys used in the code but missing in en.json (error)
//  - keys in en.json that are not used anywhere in the code (error)
//  - mismatching placeholders {name} between en and other languages (error)
//  - empty or non-string values (error)
// Plural keys (x.one / x.other ...) count as a group: every language needs x.other, other categories are optional.
// Dynamic keys in the code (t(`prefix.${id}`)) mark every key with that prefix as used.
// A comment "i18n-keys: prefix.*" or "i18n-keys: a.b, c.d" can also mark keys as used.

import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { LOCALES_DIR } from "../../core/scripts/build/larpLocales.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const REFERENCE = "en";
const PLURAL = ["zero", "one", "two", "few", "many", "other"];

const SOURCE_DIRS = [
    "core/src/plugins",
    "core/src/components",
    "desktop/src",
    "desktop/static/views"
];
// Only scan Larpcord files (upstream plugins don't use t())
const SOURCE_FILTER = p =>
    (/[\\/]plugins[\\/]larp/.test(p) || /[\\/]desktop[\\/]/.test(p) || /[\\/]_core[\\/]settings/.test(p))
    // the i18n infrastructure itself (only contains example keys in comments)
    && !/[\\/]larpCore[\\/]i18n[\\/]/.test(p) && !/[\\/]views[\\/]i18n\.js$/.test(p);

const errors = [];
const warnings = [];
const err = msg => errors.push(msg);

function loadLocales() {
    const out = {};
    for (const file of readdirSync(LOCALES_DIR).filter(f => f.endsWith(".json")).sort()) {
        const name = file.slice(0, -5);
        let data;
        try {
            data = JSON.parse(readFileSync(join(LOCALES_DIR, file), "utf8"));
        } catch (e) {
            err(`${file}: invalid JSON (${e.message})`);
            continue;
        }
        if (!data || typeof data !== "object" || Array.isArray(data)) {
            err(`${file}: root must be an object`);
            continue;
        }
        for (const [k, v] of Object.entries(data)) {
            if (typeof v !== "string") err(`${file}: "${k}" is not a string`);
            else if (!v.trim()) err(`${file}: "${k}" ist leer`);
        }
        out[name] = data;
    }
    return out;
}

/** "a.b.one" → "a.b" (Mehrzahl-Gruppe), sonst null */
function pluralBase(key) {
    const i = key.lastIndexOf(".");
    if (i < 0) return null;
    return PLURAL.includes(key.slice(i + 1)) ? key.slice(0, i) : null;
}

/** Normalized key set: plural groups as "base#plural" */
function logicalKeys(dict) {
    const keys = new Set();
    for (const k of Object.keys(dict)) {
        const base = pluralBase(k);
        keys.add(base ? `${base}#plural` : k);
    }
    return keys;
}

function placeholders(text) {
    return [...String(text).matchAll(/\{(\w+)\}/g)].map(m => m[1]).sort();
}

function placeholdersOf(dict, logical) {
    if (logical.endsWith("#plural")) {
        const base = logical.slice(0, -"#plural".length);
        const set = new Set();
        for (const cat of PLURAL) for (const p of placeholders(dict[`${base}.${cat}`] ?? "")) set.add(p);
        set.delete("count"); // count may be missing in single categories ("one preset")
        return [...set].sort();
    }
    return placeholders(dict[logical] ?? "");
}

function walk(dir, files = []) {
    let entries;
    try {
        entries = readdirSync(dir);
    } catch {
        return files;
    }
    for (const name of entries) {
        if (name === "node_modules" || name === "dist" || name === "locales") continue;
        const full = join(dir, name);
        const st = statSync(full);
        if (st.isDirectory()) walk(full, files);
        else if (/\.(tsx?|mts|mjs|js|html)$/.test(name) && SOURCE_FILTER(full)) files.push(full);
    }
    return files;
}

function scanSources() {
    const used = new Map(); // key → erste Fundstelle
    const prefixes = new Map();
    const callRe = /\b(?:t|tNode|tKey|i18nKey|hasTranslation)\(\s*(["'`])((?:(?!\1)[^\\\n]|\\.)*)\1/g;
    const attrRe = /data-i18n(?:-[a-z]+)?=["']([\w.-]+)["']/g;
    const keyPropRe = /\b(?:labelKey|titleKey|descriptionKey|nameKey|textKey|tooltipKey|placeholderKey|i18nKey)\s*:\s*["']([\w.-]+)["']/g;
    const annotationRe = /i18n-keys:\s*([\w.*,\s-]+)/g;

    for (const dir of SOURCE_DIRS) {
        for (const file of walk(join(ROOT, dir))) {
            const src = readFileSync(file, "utf8");
            const rel = relative(ROOT, file).replaceAll("\\", "/");
            for (const m of src.matchAll(callRe)) {
                const [, quote, key] = m;
                if (quote === "`" && key.includes("${")) {
                    const prefix = key.slice(0, key.indexOf("${"));
                    if (prefix) prefixes.set(prefix, rel);
                    continue;
                }
                if (!used.has(key)) used.set(key, rel);
            }
            for (const re of [attrRe, keyPropRe]) {
                for (const m of src.matchAll(re)) if (!used.has(m[1])) used.set(m[1], rel);
            }
            for (const m of src.matchAll(annotationRe)) {
                for (const part of m[1].split(",").map(s => s.trim()).filter(Boolean)) {
                    if (part.endsWith("*")) prefixes.set(part.slice(0, -1), rel);
                    else if (!used.has(part)) used.set(part, rel);
                }
            }
        }
    }
    return { used, prefixes };
}

const locales = loadLocales();
const ref = locales[REFERENCE];
if (!ref) {
    console.error(`Reference language ${REFERENCE}.json missing in ${LOCALES_DIR}`);
    process.exit(1);
}
if (!locales.de) err("de.json missing (required language)");

const refKeys = logicalKeys(ref);
for (const key of refKeys) {
    if (key.endsWith("#plural") && ref[`${key.slice(0, -7)}.other`] == null) err(`en.json: plural group "${key.slice(0, -7)}" needs ".other"`);
}

for (const [name, dict] of Object.entries(locales)) {
    if (name === REFERENCE) continue;
    const keys = logicalKeys(dict);
    for (const key of refKeys) {
        const label = key.replace("#plural", " (Mehrzahl)");
        if (!keys.has(key)) err(`${name}.json: missing key "${label}"`);
        else {
            if (key.endsWith("#plural") && dict[`${key.slice(0, -7)}.other`] == null) err(`${name}.json: Mehrzahl-Gruppe "${key.slice(0, -7)}" braucht ".other"`);
            const a = placeholdersOf(ref, key).join(",");
            const b = placeholdersOf(dict, key).join(",");
            if (a !== b) err(`${name}.json: Platzhalter von "${label}" weichen ab (en: {${a}} / ${name}: {${b}})`);
        }
    }
    for (const key of keys) {
        if (!refKeys.has(key)) err(`${name}.json: unused key "${key.replace("#plural", " (plural)")}" (not in en.json)`);
    }
}

const { used, prefixes } = scanSources();
const refPlain = new Set([...refKeys].map(k => k.replace("#plural", "")));
for (const [key, where] of used) {
    if (!refPlain.has(key)) err(`Code uses "${key}" (${where}), the key is missing in en.json`);
}
for (const key of refPlain) {
    if (used.has(key)) continue;
    if ([...prefixes.keys()].some(p => key.startsWith(p))) continue;
    err(`en.json: key "${key}" is not used anywhere in the code (unused)`);
}

const langs = Object.keys(locales);
for (const w of warnings) console.warn(`Warnung: ${w}`);
if (errors.length) {
    for (const e of errors) console.error(`✗ ${e}`);
    console.error(`\ni18n check failed: ${errors.length} problem(s) in ${langs.length} language file(s) [${langs.join(", ")}]`);
    process.exit(1);
}
console.log(`✓ i18n check passed: ${refKeys.size} keys, ${langs.length} languages [${langs.join(", ")}], ${used.size} direct uses in code`);
