/*
 * Larpcord, a standalone Discord client for local cosmetic larping
 * Copyright (c) 2026 Larpcord contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { errorText, LarpError, t, tNode, useLarpLocale } from "@plugins/larpCore/i18n";
import { LarpStore, logger, presetKey, useLarpProfile } from "@plugins/larpCore/store";
import { LarpExportFile, LarpPreset } from "@plugins/larpCore/types";
import { parseExportFile } from "@plugins/larpCore/validate";
import { chooseFile, saveFile } from "@utils/web";
import { showToast, Toasts, useState } from "@webpack/common";

import { Btn, cl, Section, Toggle } from "./components";

/** Format bleibt version 1. Mitgelieferte Presets werden mit ihrem Namen in der aktuellen Sprache exportiert. */
function exportPresets(presets: LarpPreset[], filename: string) {
    const data: LarpExportFile = { version: 1, presets: presets.map(({ name, profile }) => ({ name, profile })) };
    saveFile(new File([JSON.stringify(data, null, 2)], filename, { type: "application/json" }));
}

// Text läuft über LarpError, deshalb für den i18n-Check:
// i18n-keys: core.import.errorTooLarge (LarpError)
async function importFile() {
    const file = await chooseFile(".json,application/json");
    if (!file) return;
    try {
        if (file.size > 20_000_000) throw new LarpError("core.import.errorTooLarge");
        const parsed = parseExportFile(await file.text());
        const count = LarpStore.importPresets(parsed.presets);
        showToast(t("core.import.success", { count }), Toasts.Type.SUCCESS);
    } catch (e) {
        logger.error("Import fehlgeschlagen", e);
        showToast(t("core.import.failed", { error: errorText(e) }), Toasts.Type.FAILURE);
    }
}

/** Dateiname aus einem Preset-Namen: Buchstaben und Ziffern aller Sprachen bleiben erhalten */
const safeFileName = (name: string) => name.replace(/[^\p{L}\p{N}_\- ]/gu, "").trim().replace(/\s+/g, "-") || "preset";

function PresetRow({ preset, active }: { preset: LarpPreset; active: boolean; }) {
    const [renaming, setRenaming] = useState(false);
    const [name, setName] = useState(preset.name);

    const run = (fn: () => void) => {
        try {
            fn();
        } catch (e) {
            showToast(errorText(e), Toasts.Type.FAILURE);
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
                    {preset.builtin && <span className={cl("tag")}>{t("core.presets.tagBuiltin")}</span>}
                    {active && <span className={cl("tag", "tag-active")}>{t("core.presets.tagActive")}</span>}
                </div>
            )}
            <div className={cl("inline")}>
                <Btn onClick={() => run(() => LarpStore.loadPreset(presetKey(preset)))}>{t("common.load")}</Btn>
                <Btn variant="secondary" title={t("core.presets.exportTooltip")} onClick={() => exportPresets([preset], `${safeFileName(preset.name)}.larp.json`)}>
                    {t("core.presets.export")}
                </Btn>
                {!preset.builtin && (renaming
                    ? <Btn variant="secondary" onClick={() => run(() => { LarpStore.renamePreset(preset.name, name); setRenaming(false); })}>{t("core.presets.renameConfirm")}</Btn>
                    : <Btn variant="secondary" onClick={() => setRenaming(true)}>{t("common.rename")}</Btn>)}
                {!preset.builtin && <Btn variant="danger" onClick={() => LarpStore.deletePreset(preset.name)}>{t("common.delete")}</Btn>}
            </div>
        </div>
    );
}

export function PresetsTab() {
    const larp = useLarpProfile();
    useLarpLocale();
    const [newName, setNewName] = useState("");
    const presets = LarpStore.getPresets();
    const active = LarpStore.activePreset;

    const save = () => {
        try {
            LarpStore.savePreset(newName);
            showToast(t("core.presets.saved", { name: newName.trim() }), Toasts.Type.SUCCESS);
            setNewName("");
        } catch (e) {
            showToast(errorText(e), Toasts.Type.FAILURE);
        }
    };

    return (
        <>
            <Section title={t("core.presets.saveTitle")} description={t("core.presets.saveDescription")}>
                <div className={cl("inline")}>
                    <input
                        className={cl("input")}
                        placeholder={t("core.presets.namePlaceholder")}
                        value={newName}
                        maxLength={60}
                        onChange={e => setNewName(e.currentTarget.value)}
                        onKeyDown={e => e.key === "Enter" && save()}
                    />
                    <Btn disabled={!newName.trim()} onClick={save}>{t("common.save")}</Btn>
                </div>
            </Section>

            <Section title={t("core.presets.listTitle")} description={t("core.presets.listDescription", { load: t("common.load") })}>
                <div className={cl("preset-list")}>
                    {presets.map(p => {
                        const key = presetKey(p);
                        return <PresetRow key={key} preset={p} active={key === active} />;
                    })}
                </div>
            </Section>

            <Section title={t("core.presets.importExportTitle")} description={tNode("core.presets.importExportDescription", { file: <code>*.larp.json</code> })}>
                <div className={cl("inline")}>
                    <Btn onClick={importFile}>{t("core.presets.import")}</Btn>
                    <Btn
                        variant="secondary"
                        disabled={!LarpStore.getUserPresets().length}
                        onClick={() => exportPresets(LarpStore.getUserPresets(), t("core.presets.exportFileName"))}
                    >
                        {t("core.presets.exportOwn")}
                    </Btn>
                </div>
            </Section>

            <Section title={t("core.general.title")}>
                <Toggle
                    label={t("core.watermark.toggle")}
                    hint={t("core.watermark.toggleHint")}
                    value={larp.watermark}
                    onChange={watermark => LarpStore.update({ watermark })}
                />
                <div className={cl("inline")} style={{ marginTop: 12 }}>
                    <Btn variant="danger" onClick={() => { LarpStore.reset(); showToast(t("core.general.resetDone"), Toasts.Type.SUCCESS); }}>
                        {t("core.general.resetAll")}
                    </Btn>
                </div>
            </Section>
        </>
    );
}
