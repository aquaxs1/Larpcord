/*
 * Larpcord, a standalone Discord client for local cosmetic larping
 * Copyright (c) 2026 Larpcord contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { React } from "@webpack/common";
import type { ReactNode } from "react";

/*
 * Release-Notes aus GitHub kommen als HTML. Nie per innerHTML einsetzen: Das HTML wird geparst und nur eine
 * kleine Liste harmloser Elemente als React-Elemente nachgebaut. Links nur mit https:, alles andere wird zu Text.
 */

const BLOCK_TAGS: Record<string, string> = {
    P: "p", UL: "ul", OL: "ol", LI: "li", PRE: "pre", BLOCKQUOTE: "blockquote",
    H1: "h4", H2: "h4", H3: "h5", H4: "h5", H5: "h6", H6: "h6"
};
const INLINE_TAGS: Record<string, string> = { STRONG: "strong", B: "strong", EM: "em", I: "em", CODE: "code", BR: "br" };
const MAX_NODES = 2000;

function convert(node: Node, key: string, budget: { left: number; }): ReactNode {
    if (budget.left-- <= 0) return null;
    if (node.nodeType === Node.TEXT_NODE) return node.textContent;
    if (node.nodeType !== Node.ELEMENT_NODE) return null;

    const el = node as Element;
    const children = Array.from(el.childNodes, (c, i) => convert(c, `${key}.${i}`, budget));
    const tag = BLOCK_TAGS[el.tagName] ?? INLINE_TAGS[el.tagName];

    if (el.tagName === "BR") return <br key={key} />;
    if (el.tagName === "A") {
        const href = el.getAttribute("href") ?? "";
        if (/^https:\/\//i.test(href)) return <a key={key} href={href} target="_blank" rel="noreferrer noopener">{children}</a>;
        return <React.Fragment key={key}>{children}</React.Fragment>;
    }
    if (tag) return React.createElement(tag, { key }, ...children);
    // Unbekannte Elemente (div, span, img, script …): nur den Text-Inhalt behalten, script/style ganz verwerfen
    if (el.tagName === "SCRIPT" || el.tagName === "STYLE" || el.tagName === "IMG") return null;
    return <React.Fragment key={key}>{children}</React.Fragment>;
}

/** Wandelt Release-Notes (HTML oder Klartext) sicher in React-Elemente um */
export function renderReleaseNotes(notes: string | null | undefined): ReactNode {
    if (!notes?.trim()) return null;
    const text = notes.slice(0, 50_000);
    if (!/<[a-z][\s\S]*>/i.test(text)) {
        return text.split(/\n{2,}/).map((para, i) => <p key={i}>{para}</p>);
    }
    try {
        const doc = new DOMParser().parseFromString(text, "text/html");
        const budget = { left: MAX_NODES };
        return Array.from(doc.body.childNodes, (n, i) => convert(n, String(i), budget));
    } catch {
        return <p>{text.replace(/<[^>]+>/g, "")}</p>;
    }
}
