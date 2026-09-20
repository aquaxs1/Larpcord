/*
 * Vesktop, a desktop app aiming to give you a snappier Discord Experience
 * Copyright (c) 2023 Vendicated and Vencord contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Settings } from "./settings";

function isValidColor(color: CSSStyleValue | undefined): color is CSSUnparsedValue & { [0]: string } {
    return color instanceof CSSUnparsedValue && typeof color[0] === "string" && CSS.supports("color", color[0]);
}

// https://gist.github.com/earthbound19/e7fe15fdf8ca3ef814750a61bc75b5ce
function clamp(value: number, min: number, max: number) {
    return Math.max(Math.min(value, max), min);
}
const linearToGamma = (c: number) => (c >= 0.0031308 ? 1.055 * Math.pow(c, 1 / 2.4) - 0.055 : 12.92 * c);

function oklabToSRGB({ L, a, b }: { L: number; a: number; b: number }) {
    let l = L + a * +0.3963377774 + b * +0.2158037573;
    let m = L + a * -0.1055613458 + b * -0.0638541728;
    let s = L + a * -0.0894841775 + b * -1.291485548;
    l **= 3;
    m **= 3;
    s **= 3;
    let R = l * +4.0767416621 + m * -3.3077115913 + s * +0.2309699292;
    let G = l * -1.2684380046 + m * +2.6097574011 + s * -0.3413193965;
    let B = l * -0.0041960863 + m * -0.7034186147 + s * +1.707614701;
    R = 255 * linearToGamma(R);
    G = 255 * linearToGamma(G);
    B = 255 * linearToGamma(B);
    R = Math.round(clamp(R, 0, 255));
    G = Math.round(clamp(G, 0, 255));
    B = Math.round(clamp(B, 0, 255));

    return `rgb(${R}, ${G}, ${B})`;
}

function resolveColor(color: string) {
    const span = document.createElement("span");
    span.style.color = color;
    span.style.display = "none";

    document.body.append(span);
    let rgbColor = getComputedStyle(span).color;
    span.remove();

    if (rgbColor.startsWith("oklab(")) {
        // scam
        const [_, L, a, b] = rgbColor.match(/oklab\((.+?)[, ]+(.+?)[, ]+(.+?)\)/) ?? [];
        if (L && a && b) {
            rgbColor = oklabToSRGB({ L: parseFloat(L), a: parseFloat(a), b: parseFloat(b) });
        }
    }

    return rgbColor;
}

const updateSplashColors = () => {
    const bodyStyles = document.body.computedStyleMap();

    const color = bodyStyles.get("--text-default");
    const backgroundColor = bodyStyles.get("--background-base-lowest");

    if (isValidColor(color)) {
        Settings.store.splashColor = resolveColor(color[0]);
    }

    if (isValidColor(backgroundColor)) {
        Settings.store.splashBackground = resolveColor(backgroundColor[0]);
    }
};

/*
 * Larpcord: Splash und Onboarding sollen zum aktuellen Thema passen, auch wenn es mitten in der Sitzung
 * gewechselt wird. Zusätzlich merken wir uns Discords „Reduzierte Bewegung“, damit die Views dann nicht
 * animieren. Alles optional und in try/catch: fehlt ein Store, bleibt es einfach bei den alten Werten.
 */

/** Discords „Reduzierte Bewegung“ übernehmen (useReducedMotion ist ein Getter, kein Hook) */
function updateReducedMotion() {
    try {
        const reduced = Vencord?.Webpack?.Common?.AccessibilityStore?.useReducedMotion;
        if (typeof reduced === "boolean") Settings.store.splashReducedMotion = reduced;
    } catch {
        // Store (noch) nicht da – Wert der letzten Sitzung bleibt stehen
    }
}

function update() {
    try {
        updateSplashColors();
    } catch {
        // computedStyleMap kann während eines Theme-Wechsels kurz fehlschlagen
    }
    updateReducedMotion();
}

// Theme-Wechsel lösen mehrere Änderungen kurz hintereinander aus → entprellen
let timer: ReturnType<typeof setTimeout> | undefined;
function scheduleUpdate() {
    if (timer) clearTimeout(timer);
    timer = setTimeout(update, 500);
}

/** Auf Theme-Wechsel horchen: Vencords Stores, dazu die theme-*-Klassen von <html> und <body> als Rückfall */
function watchTheme() {
    try {
        const { ThemeStore, AccessibilityStore } = Vencord?.Webpack?.Common ?? ({} as any);
        ThemeStore?.addChangeListener?.(scheduleUpdate);
        AccessibilityStore?.addChangeListener?.(scheduleUpdate);
    } catch {
        // egal, der Observer unten greift trotzdem
    }

    try {
        const observer = new MutationObserver(scheduleUpdate);
        for (const el of [document.documentElement, document.body]) {
            if (el) observer.observe(el, { attributes: true, attributeFilter: ["class", "style"] });
        }
    } catch {
        // MutationObserver nicht verfügbar – dann bleibt es bei load/beforeunload
    }
}

function init() {
    update();
    watchTheme();
}

if (document.readyState === "complete") {
    init();
} else {
    window.addEventListener("load", init);
}

window.addEventListener("beforeunload", update);
