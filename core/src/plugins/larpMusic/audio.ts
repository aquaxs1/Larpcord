/*
 * Larpcord, a standalone Discord client for local cosmetic larping
 * Copyright (c) 2026 Larpcord contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { LarpStore, logger } from "@plugins/larpCore/store";
import { LarpMusic, LarpMusicSource } from "@plugins/larpCore/types";

/*
 * Ein einziger Player für die ganze App. Profil-Popout und Profil-Fenster können gleichzeitig
 * offen sein, deshalb zählt acquire()/release() mit, wie viele Ansichten gerade Musik wollen.
 * Beim letzten release() wird ausgeblendet und gestoppt.
 *
 * Alles läuft rein lokal: Die Datei kommt aus dem Larpcord-Datenordner (vesktop://music/<id>)
 * oder von einer https-Adresse, die der Nutzer selbst eingetragen hat.
 */

let audio: HTMLAudioElement | undefined;
let listeners = 0;
let fadeTimer: ReturnType<typeof setInterval> | undefined;
const changeListeners = new Set<() => void>();

/** Quelle als abspielbare Adresse. Dateien gibt es nur in der Desktop-App. */
export function sourceUrl(source: LarpMusicSource | undefined): string | undefined {
    if (!source) return undefined;
    if (source.kind === "url") return source.url;
    if (!source.id) return undefined;
    try {
        return IS_VESKTOP ? VesktopNative?.larpcord?.music?.url?.(source.id) : undefined;
    } catch {
        return undefined;
    }
}

export function songTitle(music: LarpMusic | undefined): string | undefined {
    const { source } = music ?? {};
    if (!source) return undefined;
    if (source.title) return source.title;
    if (source.kind === "url" && source.url) {
        try {
            return decodeURIComponent(new URL(source.url).pathname.split("/").pop() ?? "") || source.url;
        } catch {
            return source.url;
        }
    }
    return source.id;
}

function emit() {
    for (const fn of changeListeners) {
        try {
            fn();
        } catch (e) {
            logger.warn("Musik-Listener fehlgeschlagen", e);
        }
    }
}

export function onPlayerChange(fn: () => void) {
    changeListeners.add(fn);
    return () => void changeListeners.delete(fn);
}

export function isPlaying() {
    return !!audio && !audio.paused;
}

export function isPaused() {
    return !!audio && audio.paused;
}

function stopFade() {
    clearInterval(fadeTimer);
    fadeTimer = undefined;
}

/** Lautstärke über `seconds` auf `to` fahren. Ohne Dauer sofort setzen. */
function fadeTo(to: number, seconds: number, done?: () => void) {
    if (!audio) return;
    stopFade();
    if (seconds <= 0) {
        audio.volume = to;
        done?.();
        return;
    }
    const steps = Math.max(1, Math.round(seconds * 20));
    const from = audio.volume;
    let step = 0;
    fadeTimer = setInterval(() => {
        if (!audio) return stopFade();
        step++;
        audio.volume = Math.max(0, Math.min(1, from + (to - from) * (step / steps)));
        if (step >= steps) {
            stopFade();
            done?.();
        }
    }, 50);
}

function currentSettings(): LarpMusic | undefined {
    const { music } = LarpStore.get();
    return music?.enabled && music.source ? music : undefined;
}

/** Eine Ansicht möchte Musik (Profil geöffnet) */
export function acquire() {
    listeners++;
    start();
}

/** Ansicht geschlossen */
export function release() {
    listeners = Math.max(0, listeners - 1);
    if (listeners === 0) stop();
}

function start() {
    try {
        const music = currentSettings();
        if (!music || music.muted || !listeners) return stop();

        const url = sourceUrl(music.source);
        if (!url) return stop();

        if (!audio) {
            audio = new Audio();
            audio.addEventListener("ended", emit);
            audio.addEventListener("play", emit);
            audio.addEventListener("pause", emit);
            audio.addEventListener("error", () => logger.warn("Profil-Musik konnte nicht abgespielt werden"));
        }

        const target = music.volume / 100;
        if (audio.src !== url) {
            audio.src = url;
            audio.currentTime = 0;
        }
        audio.loop = music.loop;
        audio.volume = music.fade > 0 ? 0 : target;

        // Startzeit erst setzen, wenn die Datei so weit ist
        const seek = () => {
            if (!audio) return;
            if (music.start > 0 && audio.currentTime < music.start) {
                try {
                    audio.currentTime = music.start;
                } catch { }
            }
        };
        if (audio.readyState >= 1) seek();
        else audio.addEventListener("loadedmetadata", seek, { once: true });

        audio.play().then(() => fadeTo(target, music.fade), e => logger.warn("Wiedergabe abgelehnt", e));
        emit();
    } catch (e) {
        logger.error("Profil-Musik konnte nicht gestartet werden", e);
    }
}

function stop() {
    if (!audio) return;
    const { fade } = LarpStore.get().music ?? { fade: 0 };
    const finish = () => {
        audio?.pause();
        if (audio) audio.currentTime = 0;
        emit();
    };
    if (fade > 0 && !audio.paused) fadeTo(0, fade, finish);
    else finish();
}

/** Mini-Player: Pause/Weiter */
export function togglePause() {
    if (!audio) return;
    if (audio.paused) audio.play().catch(() => { });
    else audio.pause();
    emit();
}

/** Einstellungen haben sich geändert: laufende Wiedergabe anpassen */
export function refresh() {
    if (!listeners) return stop();
    const music = currentSettings();
    if (!music || music.muted) return stop();
    if (!audio || audio.paused) return start();
    const url = sourceUrl(music.source);
    if (url && audio.src !== url) return start();
    audio.loop = music.loop;
    stopFade();
    audio.volume = music.volume / 100;
    emit();
}

/** Beim Deaktivieren des Plugins alles abräumen */
export function dispose() {
    stopFade();
    listeners = 0;
    audio?.pause();
    audio = undefined;
    emit();
}
