/*
 * Larpcord, a standalone Discord client for local cosmetic larping
 * Copyright (c) 2026 Larpcord contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import * as DataStore from "@api/DataStore";
import { Logger } from "@utils/Logger";
import { useEffect, useReducer, UserStore } from "@webpack/common";

import { BUILTIN_PRESETS, createDefaultProfile } from "./defaults";
import { DeepPartial, LarpPreset, LarpProfile } from "./types";
import { sanitizePreset, sanitizeProfile } from "./validate";

/*
 * Zentraler Larpcord-Store. Alles liegt lokal in Vencords DataStore (IndexedDB im Renderer).
 * Es werden niemals Daten an Discord gesendet.
 */

const STORE_KEY = "Larpcord_state";
export const logger = new Logger("Larpcord", "#eb459e");

interface PersistedState {
    version: 1;
    profile: LarpProfile;
    /** nur eigene Presets, die mitgelieferten kommen aus BUILTIN_PRESETS */
    presets: LarpPreset[];
    activePreset?: string;
}

let state: PersistedState = { version: 1, profile: createDefaultProfile(), presets: [] };
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
                    state = {
                        version: 1,
                        profile: sanitizeProfile(saved.profile),
                        presets: (Array.isArray(saved.presets) ? saved.presets : []).map(sanitizePreset).filter(Boolean) as LarpPreset[],
                        activePreset: typeof saved.activePreset === "string" ? saved.activePreset : undefined
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
    replace(profile: LarpProfile, activePreset?: string) {
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

    get activePreset() {
        return state.activePreset;
    },

    getPresets(): LarpPreset[] {
        return [...BUILTIN_PRESETS, ...state.presets];
    },

    getUserPresets(): LarpPreset[] {
        return state.presets;
    },

    findPreset(name: string) {
        return this.getPresets().find(p => p.name === name);
    },

    /** Speichert das aktuelle Profil als Preset (überschreibt ein eigenes Preset gleichen Namens) */
    savePreset(name: string) {
        name = name.trim().slice(0, 60);
        if (!name) throw new Error("Bitte einen Namen angeben.");
        if (BUILTIN_PRESETS.some(p => p.name === name)) throw new Error("Mitgelieferte Presets können nicht überschrieben werden.");

        const preset: LarpPreset = { name, profile: structuredClone(state.profile) };
        const presets = state.presets.filter(p => p.name !== name);
        presets.push(preset);
        state = { ...state, presets, activePreset: name };
        persist();
        emit();
    },

    loadPreset(name: string) {
        const preset = this.findPreset(name);
        if (!preset) throw new Error(`Preset „${name}“ nicht gefunden.`);
        // Server-Einstellungen sind an eigene Server gebunden → beim Preset-Wechsel behalten, falls das Preset keine hat
        const profile = structuredClone(preset.profile);
        if (!Object.keys(profile.servers).length) profile.servers = state.profile.servers;
        // Genauso das Layout: Presets ohne eigenes Layout lassen das aktuelle stehen
        if (!profile.layout && state.profile.layout) profile.layout = state.profile.layout;
        this.replace(profile, name);
    },

    deletePreset(name: string) {
        state = {
            ...state,
            presets: state.presets.filter(p => p.name !== name),
            activePreset: state.activePreset === name ? undefined : state.activePreset
        };
        persist();
        emit();
    },

    renamePreset(oldName: string, newName: string) {
        newName = newName.trim().slice(0, 60);
        if (!newName) throw new Error("Bitte einen Namen angeben.");
        if (this.getPresets().some(p => p.name === newName)) throw new Error(`„${newName}“ existiert bereits.`);
        state = {
            ...state,
            presets: state.presets.map(p => p.name === oldName ? { ...p, name: newName } : p),
            activePreset: state.activePreset === oldName ? newName : state.activePreset
        };
        persist();
        emit();
    },

    /** Fügt importierte Presets hinzu. Namenskonflikte bekommen ein Suffix. Gibt die Anzahl zurück. */
    importPresets(presets: LarpPreset[]) {
        const existing = new Set(this.getPresets().map(p => p.name));
        const added: LarpPreset[] = [];
        for (const p of presets) {
            let { name } = p, i = 2;
            while (existing.has(name)) name = `${p.name} (${i++})`;
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
