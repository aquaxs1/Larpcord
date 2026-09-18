/*
 * Larpcord, a standalone Discord client for local cosmetic larping
 * Copyright (c) 2026 Larpcord contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { LarpStore, logger, useLarpProfile } from "@plugins/larpCore/store";
import { LarpExportFile, LarpPreset } from "@plugins/larpCore/types";
import { parseExportFile } from "@plugins/larpCore/validate";
import { chooseFile, saveFile } from "@utils/web";
import { showToast, Toasts, useState } from "@webpack/common";

import { Btn, cl, Section, Toggle } from "./components";

function exportPresets(presets: LarpPreset[], filename: string) {
    const data: LarpExportFile = { version: 1, presets: presets.map(({ name, profile }) => ({ name, profile })) };
    saveFile(new File([JSON.stringify(data, null, 2)], filename, { type: "application/json" }));
}

async function importFile() {
    const file = await chooseFile(".json,application/json");
    if (!file) return;
    try {
        if (file.size > 20_000_000) throw new Error("Datei ist zu groß.");
        const parsed = parseExportFile(await file.text());
        const count = LarpStore.importPresets(parsed.presets);
        showToast(`${count} Preset${count === 1 ? "" : "s"} importiert`, Toasts.Type.SUCCESS);
    } catch (e) {
        logger.error("Import fehlgeschlagen", e);
        showToast(`Import fehlgeschlagen: ${e instanceof Error ? e.message : e}`, Toasts.Type.FAILURE);
    }
}

const safeFileName = (name: string) => name.replace(/[^\w\-äöüÄÖÜß ]/g, "").trim().replace(/\s+/g, "-") || "preset";

function PresetRow({ preset, active }: { preset: LarpPreset; active: boolean; }) {
    const [renaming, setRenaming] = useState(false);
    const [name, setName] = useState(preset.name);

    const run = (fn: () => void) => {
        try {
            fn();
        } catch (e) {
            showToast(e instanceof Error ? e.message : String(e), Toasts.Type.FAILURE);
        }
    };

    return (
        <div className={cl("preset", active && "preset-active")}>
            {renaming ? (
                <input
                    className={cl("input")}
                    autoFocus
                    value={name}
                    maxLength={60}
                    onChange={e => setName(e.currentTarget.value)}
                    onKeyDown={e => {
                        if (e.key === "Enter") run(() => { LarpStore.renamePreset(preset.name, name); setRenaming(false); });
                        if (e.key === "Escape") { setName(preset.name); setRenaming(false); }
                    }}
                />
            ) : (
                <div className={cl("preset-name")}>
                    {preset.name}
                    {preset.builtin && <span className={cl("tag")}>mitgeliefert</span>}
                    {active && <span className={cl("tag", "tag-active")}>aktiv</span>}
                </div>
            )}
            <div className={cl("inline")}>
                <Btn onClick={() => run(() => LarpStore.loadPreset(preset.name))}>Laden</Btn>
                <Btn variant="secondary" title="Als .larp.json exportieren" onClick={() => exportPresets([preset], `${safeFileName(preset.name)}.larp.json`)}>Export</Btn>
                {!preset.builtin && (renaming
                    ? <Btn variant="secondary" onClick={() => run(() => { LarpStore.renamePreset(preset.name, name); setRenaming(false); })}>OK</Btn>
                    : <Btn variant="secondary" onClick={() => setRenaming(true)}>Umbenennen</Btn>)}
                {!preset.builtin && <Btn variant="danger" onClick={() => LarpStore.deletePreset(preset.name)}>Löschen</Btn>}
            </div>
        </div>
    );
}

export function PresetsTab() {
    const larp = useLarpProfile();
    const [newName, setNewName] = useState("");
    const presets = LarpStore.getPresets();
    const active = LarpStore.activePreset;

    const save = () => {
        try {
            LarpStore.savePreset(newName);
            showToast(`Preset „${newName.trim()}“ gespeichert`, Toasts.Type.SUCCESS);
            setNewName("");
        } catch (e) {
            showToast(e instanceof Error ? e.message : String(e), Toasts.Type.FAILURE);
        }
    };

    return (
        <>
            <Section title="Aktuelles Setup speichern" description="Speichert alle Larp-Einstellungen (Badges, Nitro, Name, Server, Theme …) als Preset.">
                <div className={cl("inline")}>
                    <input
                        className={cl("input")}
                        placeholder="Name des Presets"
                        value={newName}
                        maxLength={60}
                        onChange={e => setNewName(e.currentTarget.value)}
                        onKeyDown={e => e.key === "Enter" && save()}
                    />
                    <Btn disabled={!newName.trim()} onClick={save}>Speichern</Btn>
                </div>
            </Section>

            <Section title="Presets" description="Ein Klick auf „Laden“ ersetzt dein aktuelles Setup.">
                <div className={cl("preset-list")}>
                    {presets.map(p => <PresetRow key={p.name} preset={p} active={p.name === active} />)}
                </div>
            </Section>

            <Section title="Import & Export" description={<>Presets als <code>*.larp.json</code> teilen. Importierte Dateien werden geprüft: Unbekannte Felder werden verworfen, Bilder nur über https:// oder als eingebettete Bilddaten.</>}>
                <div className={cl("inline")}>
                    <Btn onClick={importFile}>Importieren…</Btn>
                    <Btn
                        variant="secondary"
                        disabled={!LarpStore.getUserPresets().length}
                        onClick={() => exportPresets(LarpStore.getUserPresets(), "meine-presets.larp.json")}
                    >
                        Eigene Presets exportieren
                    </Btn>
                </div>
            </Section>

            <Section title="Allgemein">
                <Toggle
                    label="Larpcord-Wasserzeichen"
                    hint="Zeigt „🎭 Larpcord“ in deinem eigenen Profil, damit Screenshots als Larp erkennbar sind."
                    value={larp.watermark}
                    onChange={watermark => LarpStore.update({ watermark })}
                />
                <div className={cl("inline")} style={{ marginTop: 12 }}>
                    <Btn variant="danger" onClick={() => { LarpStore.reset(); showToast("Larp-Einstellungen zurückgesetzt", Toasts.Type.SUCCESS); }}>
                        Alles zurücksetzen
                    </Btn>
                </div>
            </Section>
        </>
    );
}
