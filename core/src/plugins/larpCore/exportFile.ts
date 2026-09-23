/*
 * Larpcord, a standalone Discord client for local cosmetic larping
 * Copyright (c) 2026 Larpcord contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { saveFile } from "@utils/web";
import { Alerts } from "@webpack/common";

import { formatLarpNumber, t } from "./i18n";
import { logger } from "./store";
import { LARP_EXPORT_VERSION, LarpExportFile, LarpPreset } from "./types";

/*
 * Export von Presets als *.larp.json.
 *
 * Bilder liegen schon als data:-URL im Preset, Musik nicht: Songs liegen als Datei im
 * Datenordner und werden nur auf Wunsch eingebettet. Weil eingebettete Dateien die Datei
 * schnell sehr groß machen, gibt es vor dem Speichern eine Größenwarnung.
 */

/** Ab dieser Größe wird vor dem Speichern gewarnt */
const WARN_BYTES = 4_000_000;

function megabytes(bytes: number) {
    return formatLarpNumber(bytes / 1_000_000, { maximumFractionDigits: 1 });
}

/** Song-Datei aus dem Datenordner als data:-URL holen (nur Desktop) */
async function embedSong(id: string): Promise<string | undefined> {
    try {
        if (!IS_VESKTOP) return undefined;
        const url = VesktopNative?.larpcord?.music?.url?.(id);
        if (!url) return undefined;
        const blob = await (await fetch(url)).blob();
        return await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = () => reject(reader.error);
            reader.readAsDataURL(blob);
        });
    } catch (e) {
        logger.warn("Song konnte nicht eingebettet werden", e);
        return undefined;
    }
}

/** Kopie der Presets, in der Datei-Songs als data:-URL stecken */
async function withEmbeddedFiles(presets: LarpPreset[]): Promise<LarpPreset[]> {
    const out: LarpPreset[] = [];
    for (const preset of presets) {
        const source = preset.profile.music?.source;
        if (source?.kind !== "file" || !source.id) {
            out.push(preset);
            continue;
        }
        const data = await embedSong(source.id);
        out.push(data
            ? { ...preset, profile: { ...preset.profile, music: { ...preset.profile.music!, source: { kind: "url", url: data, title: source.title } } } }
            : preset);
    }
    return out;
}

/** Gibt es in den Presets überhaupt eine Song-Datei zum Einbetten? */
export function hasSongFile(presets: LarpPreset[]) {
    return presets.some(p => p.profile.music?.source?.kind === "file" && !!p.profile.music.source.id);
}

/**
 * Presets speichern. `embed` bettet Song-Dateien ein. Ist die Datei größer als WARN_BYTES,
 * fragt Larpcord vorher nach.
 */
export async function exportPresets(presets: LarpPreset[], filename: string, embed = false) {
    const prepared = embed ? await withEmbeddedFiles(presets) : presets;
    const data: LarpExportFile = {
        version: LARP_EXPORT_VERSION,
        presets: prepared.map(({ name, profile }) => ({ name, profile }))
    };
    const json = JSON.stringify(data, null, 2);
    const file = new File([json], filename, { type: "application/json" });

    if (file.size < WARN_BYTES) return saveFile(file);

    Alerts.show({
        title: t("core.export.sizeTitle"),
        body: t("core.export.sizeBody", { size: megabytes(file.size) }),
        confirmText: t("core.export.sizeConfirm"),
        cancelText: t("common.cancel"),
        onConfirm: () => saveFile(file)
    });
}
