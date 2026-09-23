/*
 * Larpcord, a standalone Discord client for local cosmetic larping
 * Copyright (c) 2026 Larpcord contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

/*
 * Profil-Musik: Songs liegen als Datei im App-Datenordner (Data/larpMusic), nicht im DataStore.
 * Der Core kennt nur die ID und spielt die Datei über vesktop://music/<id> ab.
 *
 * Es werden nur Dateien gespeichert, die der Nutzer selbst auswählt. Larpcord liefert keine Songs mit.
 */

import { app, dialog, net } from "electron";
import { createReadStream, existsSync } from "fs";
import { mkdir, readdir, rm, stat, writeFile } from "fs/promises";
import { basename, extname, join } from "path";
import { IpcEvents } from "shared/IpcEvents";

import { DATA_DIR } from "./constants";
import { t } from "./i18n";
import { mainWin } from "./mainWindow";
import { handle } from "./utils/ipcWrappers";

const MUSIC_DIR = join(DATA_DIR, "larpMusic");
const MAX_BYTES = 20 * 1024 * 1024;

/** Erlaubte Formate (alles, was Chromium ohne zusätzliche Codecs abspielt) */
const EXTENSIONS = ["mp3", "ogg", "wav", "m4a"] as const;
const MIME: Record<string, string> = {
    mp3: "audio/mpeg",
    ogg: "audio/ogg",
    wav: "audio/wav",
    m4a: "audio/mp4"
};

export interface LarpSong {
    /** Dateiname ohne Endung, zugleich die ID */
    id: string;
    /** Anzeigename */
    title: string;
    ext: string;
    bytes: number;
}

/** IDs enthalten nur harmlose Zeichen, damit daraus kein Pfad ausbrechen kann */
const safeId = (id: unknown) => typeof id === "string" ? id.replace(/[^\w-]/g, "").slice(0, 64) : "";

function fileFor(id: string, ext: string) {
    return join(MUSIC_DIR, `${id}.${ext}`);
}

async function findFile(id: string) {
    const clean = safeId(id);
    if (!clean) return null;
    for (const ext of EXTENSIONS) {
        const path = fileFor(clean, ext);
        if (existsSync(path)) return { path, ext };
    }
    return null;
}

export async function listSongs(): Promise<LarpSong[]> {
    try {
        const files = await readdir(MUSIC_DIR);
        const songs: LarpSong[] = [];
        for (const file of files) {
            const ext = extname(file).slice(1).toLowerCase();
            if (!EXTENSIONS.includes(ext as (typeof EXTENSIONS)[number])) continue;
            const id = basename(file, extname(file));
            const info = await stat(join(MUSIC_DIR, file)).catch(() => null);
            // IDs beginnen mit einem Zeitstempel in Basis 36, für die Anzeige fällt der weg
            songs.push({ id, title: id.replace(/^[a-z0-9]+-/, ""), ext, bytes: info?.size ?? 0 });
        }
        return songs;
    } catch {
        return [];
    }
}

/** Datei auswählen und in den Datenordner kopieren. Gibt den neuen Eintrag zurück. */
async function chooseSong(): Promise<LarpSong | { error: string; }> {
    const res = await dialog.showOpenDialog(mainWin, {
        properties: ["openFile"],
        title: t("desktop.music.dialogTitle"),
        defaultPath: app.getPath("music"),
        filters: [{ name: t("desktop.music.filterAudio"), extensions: [...EXTENSIONS] }]
    });
    if (res.canceled || !res.filePaths.length) return { error: "cancelled" };

    const source = res.filePaths[0];
    const ext = extname(source).slice(1).toLowerCase();
    if (!EXTENSIONS.includes(ext as (typeof EXTENSIONS)[number])) return { error: "format" };

    const info = await stat(source).catch(() => null);
    if (!info) return { error: "read" };
    if (info.size > MAX_BYTES) return { error: "size" };

    // Titel aus dem Dateinamen, ID zusätzlich mit Zeitstempel, damit nichts überschrieben wird
    const title = basename(source, extname(source)).slice(0, 80);
    const id = `${Date.now().toString(36)}-${title.replace(/[^\w-]/g, "_")}`.slice(0, 64);

    try {
        await mkdir(MUSIC_DIR, { recursive: true });
        // Nicht copyFile: so ist die Größenprüfung oben auch die Größe, die geschrieben wird
        const { readFile } = await import("fs/promises");
        const data = await readFile(source);
        if (data.byteLength > MAX_BYTES) return { error: "size" };
        await writeFile(fileFor(id, ext), data);
    } catch (e) {
        console.error("Failed to store song", e);
        return { error: "write" };
    }

    return { id, title, ext, bytes: info.size };
}

async function deleteSong(id: unknown) {
    const found = await findFile(id as string);
    if (!found) return false;
    try {
        await rm(found.path, { force: true });
        return true;
    } catch (e) {
        console.error("Failed to delete song", e);
        return false;
    }
}

/** vesktop://music/<id> – liefert die gespeicherte Datei aus */
export async function handleLarpMusicProtocol(path: string) {
    const found = await findFile(path.slice(1));
    if (!found) return new Response(null, { status: 404 });
    try {
        const stream = createReadStream(found.path);
        return new Response(stream as unknown as ReadableStream, {
            headers: { "content-type": MIME[found.ext] ?? "application/octet-stream" }
        });
    } catch {
        return net.fetch(`file://${found.path.replace(/\\/g, "/")}`);
    }
}

handle(IpcEvents.LARP_MUSIC_LIST, () => listSongs());
handle(IpcEvents.LARP_MUSIC_CHOOSE, () => chooseSong());
handle(IpcEvents.LARP_MUSIC_DELETE, (_e, id: unknown) => deleteSong(id));
