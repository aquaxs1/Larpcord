/*
 * Larpcord, a standalone Discord client for local cosmetic larping
 * Copyright (c) 2026 Larpcord contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import * as DataStore from "@api/DataStore";
import { Logger } from "@utils/Logger";
import { useEffect, useReducer, UserStore } from "@webpack/common";

import { BUILTIN_PRESETS, createDefaultProfile, findBuiltinPreset, isReservedPresetName, LEGACY_BUILTIN_NAMES } from "./defaults";
import { LarpError } from "./i18n";
import { DeepPartial, LarpPreset, LarpProfile } from "./types";
import { sanitizePreset, sanitizeProfile } from "./validate";

/*
 * Zentraler Larpcord-Store. Alles liegt lokal in Vencords DataStore (IndexedDB im Renderer).
 * Es werden niemals Daten an Discord gesendet.
 */

const STORE_KEY = "Larpcord_state";
export const logger = new Logger("Larpcord", "#eb459e");

/**
 * Stabile Identität eines Presets: "builtin:<id>" für mitgelieferte, "user:<name>" für eigene.
 * Anzeigenamen der mitgelieferten Presets hängen von der Sprache ab und taugen deshalb nicht als Schlüssel.
 */
export type PresetKey = string;

export function userPresetKey(name: string): PresetKey {
    return `user:${name}`;
}

export function presetKey(p: Pick<LarpPreset, "name" | "builtinId">): PresetKey {
    return p.builtinId ? `builtin:${p.builtinId}` : userPresetKey(p.name);
}

/**
 * Interner Speicherstand (nicht das Import/Export-Format).
 * Version 2: activePreset ist ein PresetKey. Version 1 speicherte dort den Namen (auch bei mitgelieferten).
 */
interface PersistedState {
    version: 2;
    profile: LarpProfile;
    /** nur eigene Presets, die mitgelieferten kommen aus BUILTIN_PRESETS */
    presets: LarpPreset[];
    activePreset?: PresetKey;
}

let state: PersistedState = { version: 2, profile: createDefaultProfile(), presets: [] };
let loaded = false;
let loadPromise: Promise<void> | undefined;
const listeners = new Set<() => void>();

function isPlainObject(v: unknown): v is Record<string, any> {
    return v != null && typeof v === "object" && !Array.isArray(v);
}

function deepMerge<T>(target: T, patch: any): T {
    if (!isPlainObject(patch) || !isPlainObject(target)) return patch as T;
    const out: Record<string, any> = { ...target };
    for (const [k, v] of Object.entries(patch)) {
        if (v === undefined) delete out[k];
        else out[k] = isPlainObject(v) && isPlainObject(out[k]) ? deepMerge(out[k], v) : v;
    }
    return out as T;
}

/** Steigt bei jeder Änderung, damit Hooks ihre Ergebnisse cachen können */
let version = 0;

/** Aktives Preset aus älteren Speicherständen (Version 1: Name) in einen PresetKey umwandeln */
function migrateActivePreset(value: unknown, savedVersion: unknown, presets: LarpPreset[]): PresetKey | undefined {
    if (typeof value !== "string" || !value) return undefined;
    let key: PresetKey = value;
    if (savedVersion !== 2) {
        const builtinId = LEGACY_BUILTIN_NAMES[value];
        key = builtinId ? `builtin:${builtinId}` : userPresetKey(value);
    }
    // Nur behalten, wenn es das Preset noch gibt
    return [...BUILTIN_PRESETS, ...presets].some(p => presetKey(p) === key) ? key : undefined;
}

function emit() {
    version++;
    for (const fn of listeners) {
        try {
            fn();
        } catch (e) {
            logger.error("Listener-Fehler", e);
        }
    }
}

let saveTimer: ReturnType<typeof setTimeout> | undefined;
function persist() {
    // Schreibzugriffe bündeln (z. B. beim Ziehen eines Farbreglers)
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
        DataStore.set(STORE_KEY, state).catch(e => logger.error("Speichern fehlgeschlagen", e));
    }, 250);
}

export const LarpStore = {
    /** Lädt den gespeicherten Zustand. Mehrfach aufrufbar, lädt nur einmal. */
    init(): Promise<void> {
        return loadPromise ??= (async () => {
            try {
                const saved = await DataStore.get<PersistedState>(STORE_KEY);
                if (saved) {
                    const presets = (Array.isArray(saved.presets) ? saved.presets : []).map(sanitizePreset).filter(Boolean) as LarpPreset[];
                    state = {
                        version: 2,
                        profile: sanitizeProfile(saved.profile),
                        presets,
                        activePreset: migrateActivePreset(saved.activePreset, (saved as { version?: unknown; }).version, presets)
                    };
                }
            } catch (e) {
                logger.error("Laden fehlgeschlagen, verwende Standardwerte", e);
            }
            loaded = true;
            emit();
        })();
    },

    get isLoaded() {
        return loaded;
    },

    get version() {
        return version;
    },

    /** Aktuelles Larp-Profil (nicht verändern, stattdessen update() nutzen) */
    get(): LarpProfile {
        return state.profile;
    },

    /** Tiefes Zusammenführen: Objekte werden gemergt, Arrays ersetzt, undefined entfernt ein Feld */
    update(patch: DeepPartial<LarpProfile> | ((p: LarpProfile) => DeepPartial<LarpProfile>)) {
        const p = typeof patch === "function" ? patch(state.profile) : patch;
        state = { ...state, profile: sanitizeProfile(deepMerge(state.profile, p)), activePreset: undefined };
        persist();
        emit();
    },

    /** Profil komplett ersetzen */
    replace(profile: LarpProfile, activePreset?: PresetKey) {
        state = { ...state, profile: sanitizeProfile(profile), activePreset };
        persist();
        emit();
    },

    reset() {
        this.replace(createDefaultProfile());
    },

    subscribe(fn: () => void) {
        listeners.add(fn);
        return () => void listeners.delete(fn);
    },

    // ---- Presets ----
    // Fehler werden als LarpError geworfen und erst in der Oberfläche übersetzt (errorText).
    // i18n-keys: core.presets.errorNameRequired, core.presets.errorBuiltinOverwrite, core.presets.errorNotFound, core.presets.errorExists (LarpError)

    /** PresetKey des aktiven Presets (siehe presetKey()) */
    get activePreset(): PresetKey | undefined {
        return state.activePreset;
    },

    getPresets(): LarpPreset[] {
        return [...BUILTIN_PRESETS, ...state.presets];
    },

    getUserPresets(): LarpPreset[] {
        return state.presets;
    },

    /**
     * Sucht ein Preset über seinen PresetKey ("builtin:<id>" / "user:<name>").
     * Aus Kompatibilität geht auch ein bloßer Name (eigenes Preset oder früherer Name eines mitgelieferten).
     */
    findPreset(key: PresetKey): LarpPreset | undefined {
        if (key.startsWith("builtin:")) return findBuiltinPreset(key.slice("builtin:".length));
        if (key.startsWith("user:")) {
            const name = key.slice("user:".length);
            const found = state.presets.find(p => p.name === name);
            if (found) return found;
        }
        const legacy = LEGACY_BUILTIN_NAMES[key];
        if (legacy) return findBuiltinPreset(legacy);
        return state.presets.find(p => p.name === key);
    },

    /** Speichert das aktuelle Profil als eigenes Preset (überschreibt ein eigenes Preset gleichen Namens) */
    savePreset(name: string) {
        name = name.trim().slice(0, 60);
        if (!name) throw new LarpError("core.presets.errorNameRequired");
        if (isReservedPresetName(name)) throw new LarpError("core.presets.errorBuiltinOverwrite");

        const preset: LarpPreset = { name, profile: structuredClone(state.profile) };
        const presets = state.presets.filter(p => p.name !== name);
        presets.push(preset);
        state = { ...state, presets, activePreset: userPresetKey(name) };
        persist();
        emit();
    },

    /** Lädt ein Preset über seinen PresetKey */
    loadPreset(key: PresetKey) {
        const preset = this.findPreset(key);
        if (!preset) throw new LarpError("core.presets.errorNotFound", { name: key.replace(/^(builtin|user):/, "") });
        // Server-Einstellungen sind an eigene Server gebunden → beim Preset-Wechsel behalten, falls das Preset keine hat
        const profile = structuredClone(preset.profile);
        if (!Object.keys(profile.servers).length) profile.servers = state.profile.servers;
        // Genauso das Layout: Presets ohne eigenes Layout lassen das aktuelle stehen
        if (!profile.layout && state.profile.layout) profile.layout = state.profile.layout;
        this.replace(profile, presetKey(preset));
    },

    /** Löscht ein eigenes Preset (mitgelieferte lassen sich nicht löschen) */
    deletePreset(name: string) {
        state = {
            ...state,
            presets: state.presets.filter(p => p.name !== name),
            activePreset: state.activePreset === userPresetKey(name) ? undefined : state.activePreset
        };
        persist();
        emit();
    },

    /** Benennt ein eigenes Preset um */
    renamePreset(oldName: string, newName: string) {
        newName = newName.trim().slice(0, 60);
        if (!newName) throw new LarpError("core.presets.errorNameRequired");
        if (newName === oldName) return;
        if (isReservedPresetName(newName) || state.presets.some(p => p.name === newName))
            throw new LarpError("core.presets.errorExists", { name: newName });
        state = {
            ...state,
            presets: state.presets.map(p => p.name === oldName ? { ...p, name: newName } : p),
            activePreset: state.activePreset === userPresetKey(oldName) ? userPresetKey(newName) : state.activePreset
        };
        persist();
        emit();
    },

    /** Fügt importierte Presets hinzu. Namenskonflikte bekommen ein Suffix. Gibt die Anzahl zurück. */
    importPresets(presets: LarpPreset[]) {
        const existing = new Set(state.presets.map(p => p.name));
        const added: LarpPreset[] = [];
        for (const p of presets) {
            let { name } = p, i = 2;
            // Konflikte mit eigenen Presets und mit Namen mitgelieferter Presets (in jeder Sprache)
            while (existing.has(name) || isReservedPresetName(name)) name = `${p.name} (${i++})`;
            existing.add(name);
            added.push({ name, profile: sanitizeProfile(p.profile) });
        }
        state = { ...state, presets: [...state.presets, ...added] };
        persist();
        emit();
        return added.length;
    }
};

/** React-Hook: rendert bei jeder Store-Änderung neu und liefert das aktuelle Profil */
export function useLarpProfile(): LarpProfile {
    const [, forceUpdate] = useReducer(x => x + 1, 0);
    useEffect(() => LarpStore.subscribe(forceUpdate), []);
    return LarpStore.get();
}

/** Regel 2: Larp-Overrides gelten ausschließlich für den eigenen User */
export function isSelf(userId: string | null | undefined): boolean {
    if (!userId) return false;
    try {
        return UserStore.getCurrentUser()?.id === userId;
    } catch {
        return false;
    }
}

export function getSelfId(): string | undefined {
    try {
        return UserStore.getCurrentUser()?.id;
    } catch {
        return undefined;
    }
}
