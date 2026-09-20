/*
 * Larpcord, a standalone Discord client for local cosmetic larping
 * Copyright (c) 2026 Larpcord contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { formatLarpNumber, t, tNode } from "@plugins/larpCore/i18n";
import { safeUrl } from "@plugins/larpCore/validate";

import { LARPCORD_LOGO } from "../logo";
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
    // Ungültiger Wert des letzten Speicherversuchs. Die Meldung wird erst beim Rendern erzeugt,
    // damit sie nach einem Sprachwechsel in der neuen Sprache erscheint.
    const [invalid, setInvalid] = useState<string>();
    useEffect(() => setDraft(value ?? ""), [value]);
    const error = invalid ? validate?.(invalid) : undefined;

    const commit = () => {
        const v = draft.trim();
        const err = v ? validate?.(v) : undefined;
        setInvalid(err ? v : undefined);
        // Nur bei echter Änderung speichern (ein bloßes Verlassen des Felds ändert nichts)
        if (!err && v !== (value ?? "").trim()) onCommit(v || undefined);
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

const urlError = (v: string) => safeUrl(v) ? undefined : t("core.field.errorUrl");

/** Entfernen-Knopf (✕) mit übersetztem Tooltip */
function RemoveBtn({ onClick }: { onClick(): void; }) {
    const label = t("common.remove");
    return <Btn variant="danger" title={label} aria-label={label} onClick={onClick}>✕</Btn>;
}

/**
 * URL-Eingabe mit Datei-Auswahl (Bild wird als data:-URL lokal gespeichert).
 * Ist eine lokale Datei gesetzt, bleibt das Textfeld leer und zeigt „(lokale Datei)“ nur als Platzhalter.
 * So gibt es keinen angezeigten Text, der zugleich als Vergleichswert dient (sprachunabhängig).
 */
export function ImageField({ value, onCommit, placeholder = "https://…", maxBytes = 1_500_000 }: {
    value: string | undefined;
    onCommit(v: string | undefined): void;
    placeholder?: string;
    maxBytes?: number;
}) {
    // Nur den Zustand merken, den Text erst beim Rendern übersetzen (Sprachwechsel)
    const [tooLarge, setTooLarge] = useState(false);
    const isLocalFile = !!value?.startsWith("data:");

    const pick = async () => {
        const file = await chooseFile("image/png,image/gif,image/jpeg,image/webp,image/svg+xml");
        if (!file) return;
        if (file.size > maxBytes) return setTooLarge(true);
        setTooLarge(false);
        onCommit(await readAsDataUrl(file));
    };

    return (
        <div className={cl("field")}>
            <div className={cl("inline")}>
                <TextField
                    value={isLocalFile ? undefined : value}
                    // Leeres Feld bei lokaler Datei ist keine Änderung (TextField speichert nur Änderungen), entfernen geht über ✕
                    onCommit={onCommit}
                    placeholder={isLocalFile ? t("common.localFile") : placeholder}
                    validate={urlError}
                />
                <Btn variant="secondary" onClick={pick}>{t("common.chooseFile")}</Btn>
                {value && <RemoveBtn onClick={() => onCommit(undefined)} />}
            </div>
            {tooLarge && (
                <small className={cl("error")}>
                    {t("core.field.errorFileTooLarge", { size: formatLarpNumber(maxBytes / 1_000_000, { maximumFractionDigits: 1 }) })}
                </small>
            )}
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
            {value && <RemoveBtn onClick={() => onCommit(undefined)} />}
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
            {value && <RemoveBtn onClick={() => onCommit(undefined)} />}
        </div>
    );
}

export function Placeholder({ title, plugin }: { title: string; plugin: string; }) {
    return (
        <div className={cl("placeholder")}>
            <img className={cl("placeholder-icon")} src={LARPCORD_LOGO} alt="" draggable={false} />
            <h3>{title}</h3>
            <p>{tNode("core.hub.pluginDisabled", { plugin: <code>{plugin}</code> })}</p>
        </div>
    );
}
