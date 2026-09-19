/*
 * Larpcord, a standalone Discord client for local cosmetic larping
 * Copyright (c) 2026 Larpcord contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

/*
 * Sicherheitsnetz: Shift beim Start gedrückt halten setzt das Layout zurück.
 *
 * Läuft schon beim Laden des Bundles (lange vor dem Plugin-Start), damit der Tastendruck
 * nicht verpasst wird. Gezählt werden nur Wiederholungen der gehaltenen Shift-Taste ohne
 * andere Tasten dazwischen, normales Tippen von Großbuchstaben löst es also nicht aus.
 */

const WINDOW_MS = 30_000;
const REQUIRED_REPEATS = 8; // ca. 1 Sekunde gedrückt halten

let repeats = 0;
let triggered = false;
let callback: (() => void) | undefined;

function onKeyDown(e: KeyboardEvent) {
    if (performance.now() > WINDOW_MS) return cleanup();
    if (e.key !== "Shift") {
        repeats = 0;
        return;
    }
    if (e.repeat && ++repeats >= REQUIRED_REPEATS) {
        triggered = true;
        cleanup();
        callback?.();
    }
}

function onKeyUp(e: KeyboardEvent) {
    if (e.key === "Shift") repeats = 0;
}

function cleanup() {
    window.removeEventListener("keydown", onKeyDown, true);
    window.removeEventListener("keyup", onKeyUp, true);
}

if (typeof window !== "undefined" && performance.now() < WINDOW_MS) {
    window.addEventListener("keydown", onKeyDown, true);
    window.addEventListener("keyup", onKeyUp, true);
    setTimeout(cleanup, Math.max(0, WINDOW_MS - performance.now()));
}

/** Ruft cb auf, sobald (oder falls schon) Shift beim Start gehalten wurde */
export function onShiftAtStartup(cb: () => void) {
    if (triggered) cb();
    else callback = cb;
}

export function clearShiftCallback() {
    callback = undefined;
}
