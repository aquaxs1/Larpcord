/*
 * Larpcord, a standalone Discord client for local cosmetic larping
 * Copyright (c) 2026 Larpcord contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { safeUrl } from "@plugins/larpCore/validate";
import { classNameFactory } from "@utils/css";
import { chooseFile } from "@utils/web";
import { useEffect, useState } from "@webpack/common";
import type { PropsWithChildren, ReactNode } from "react";

/*
 * Schlichte, eigene Formular-Bausteine auf Basis nativer Elemente. Bewusst unabhängig von
 * Discords internen Komponenten, damit der Hub auch nach Discord-Updates funktioniert.
 */

export const cl = classNameFactory("larp-");

export function Section({ title, description, children }: PropsWithChildren<{ title: string; description?: ReactNode; }>) {
    return (
        <section className={cl("section")}>
            <h3 className={cl("section-title")}>{title}</h3>
            {description && <p className={cl("section-desc")}>{description}</p>}
            {children}
        </section>
    );
}

export function Row({ label, hint, children }: PropsWithChildren<{ label: ReactNode; hint?: ReactNode; }>) {
    return (
        <div className={cl("row")}>
            <div className={cl("row-label")}>
                <span>{label}</span>
                {hint && <small>{hint}</small>}
            </div>
            <div className={cl("row-control")}>{children}</div>
        </div>
    );
}

export function Toggle({ value, onChange, label, hint }: { value: boolean; onChange(v: boolean): void; label: ReactNode; hint?: ReactNode; }) {
    return (
        <Row label={label} hint={hint}>
            <button
                role="switch"
                aria-checked={value}
                className={cl("toggle", value && "toggle-on")}
                onClick={() => onChange(!value)}
            >
                <span className={cl("toggle-knob")} />
            </button>
        </Row>
    );
}

export function Btn({ variant = "primary", ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "danger"; }) {
    return <button {...props} className={[cl("btn", `btn-${variant}`), props.className].filter(Boolean).join(" ")} />;
}

export function TextField({ value, onCommit, placeholder, maxLength, validate }: {
    value: string | undefined;
    onCommit(v: string | undefined): void;
    placeholder?: string;
    maxLength?: number;
    /** Gibt eine Fehlermeldung zurück, wenn der Wert ungültig ist */
    validate?(v: string): string | undefined;
}) {
    const [draft, setDraft] = useState(value ?? "");
    const [error, setError] = useState<string>();
    useEffect(() => setDraft(value ?? ""), [value]);

    const commit = () => {
        const v = draft.trim();
        const err = v ? validate?.(v) : undefined;
        setError(err);
        if (!err) onCommit(v || undefined);
    };

    return (
        <div className={cl("field")}>
            <input
                className={cl("input", error && "input-error")}
                value={draft}
                placeholder={placeholder}
                maxLength={maxLength}
                onChange={e => setDraft(e.currentTarget.value)}
                onBlur={commit}
                onKeyDown={e => e.key === "Enter" && commit()}
            />
            {error && <small className={cl("error")}>{error}</small>}
        </div>
    );
}

const urlError = (v: string) => safeUrl(v) ? undefined : "Nur https:// oder data:image/-URLs";

/** URL-Eingabe mit Datei-Auswahl (Bild wird als data:-URL lokal gespeichert) */
export function ImageField({ value, onCommit, placeholder = "https://…", maxBytes = 1_500_000 }: {
    value: string | undefined;
    onCommit(v: string | undefined): void;
    placeholder?: string;
    maxBytes?: number;
}) {
    const [error, setError] = useState<string>();

    const pick = async () => {
        const file = await chooseFile("image/png,image/gif,image/jpeg,image/webp,image/svg+xml");
        if (!file) return;
        if (file.size > maxBytes) return setError(`Datei zu groß (max. ${Math.round(maxBytes / 1_000_000 * 10) / 10} MB)`);
        setError(undefined);
        onCommit(await readAsDataUrl(file));
    };

    return (
        <div className={cl("field")}>
            <div className={cl("inline")}>
                <TextField value={value?.startsWith("data:") ? "(lokale Datei)" : value} onCommit={v => v !== "(lokale Datei)" && onCommit(v)} placeholder={placeholder} validate={v => v === "(lokale Datei)" ? undefined : urlError(v)} />
                <Btn variant="secondary" onClick={pick}>Datei…</Btn>
                {value && <Btn variant="danger" onClick={() => onCommit(undefined)}>✕</Btn>}
            </div>
            {error && <small className={cl("error")}>{error}</small>}
        </div>
    );
}

export function readAsDataUrl(file: File) {
    return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
    });
}

export function DateField({ value, onCommit }: { value: string | undefined; onCommit(v: string | undefined): void; }) {
    const day = value ? value.slice(0, 10) : "";
    return (
        <div className={cl("inline")}>
            <input
                type="date"
                className={cl("input")}
                value={day}
                min="2015-01-01"
                max={new Date().toISOString().slice(0, 10)}
                onChange={e => {
                    const v = e.currentTarget.value;
                    onCommit(v ? new Date(v + "T12:00:00.000Z").toISOString() : undefined);
                }}
            />
            {value && <Btn variant="danger" onClick={() => onCommit(undefined)}>✕</Btn>}
        </div>
    );
}

export function ColorField({ value, onChange }: { value: string | undefined; onChange(v: string): void; }) {
    return <input type="color" className={cl("color")} value={value ?? "#5865f2"} onChange={e => onChange(e.currentTarget.value)} />;
}

export function ColorPairField({ value, onCommit, defaults = ["#5865f2", "#eb459e"] }: {
    value: [string, string] | undefined;
    onCommit(v: [string, string] | undefined): void;
    defaults?: [string, string];
}) {
    const [a, b] = value ?? defaults;
    return (
        <div className={cl("inline")}>
            <ColorField value={a} onChange={v => onCommit([v, b])} />
            <ColorField value={b} onChange={v => onCommit([a, v])} />
            <span className={cl("swatch")} style={{ background: `linear-gradient(90deg, ${a}, ${b})`, opacity: value ? 1 : 0.35 }} />
            {value && <Btn variant="danger" onClick={() => onCommit(undefined)}>✕</Btn>}
        </div>
    );
}

export function Placeholder({ title, plugin }: { title: string; plugin: string; }) {
    return (
        <div className={cl("placeholder")}>
            <div className={cl("placeholder-icon")}>🎭</div>
            <h3>{title}</h3>
            <p>Das Plugin <code>{plugin}</code> ist nicht aktiv. Aktiviere es unter Einstellungen → Plugins.</p>
        </div>
    );
}
