/*
 * Larpcord, a standalone Discord client for local cosmetic larping
 * Copyright (c) 2026 Larpcord contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Btn, cl, ImageField, Row, Section, TextField, Toggle } from "@plugins/larpCore/hub/components";
import { t, useLarpLocale } from "@plugins/larpCore/i18n";
import { LarpStore, useLarpProfile } from "@plugins/larpCore/store";
import { LarpActivities, LarpActivity, LarpActivityFields, LarpActivityRule, LarpActivityTimes, LarpActivityType } from "@plugins/larpCore/types";
import { useState } from "@webpack/common";

import { detectedActivities } from "./detected";
import { ActivityPreview } from "./Preview";

const EMPTY: LarpActivities = { enabled: true, list: [], rules: [] };

const ACTIVITY_TYPES: LarpActivityType[] = [0, 2, 3, 1, 5, 4];

/** Anzeigename eines Aktivitätstyps */
export function typeName(type: LarpActivityType) {
    return t(`activity.type.${type}`); // i18n-keys: activity.type.*
}

function newId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function update(fn: (a: LarpActivities) => LarpActivities) {
    LarpStore.update(p => ({ activities: fn(p.activities ?? EMPTY) }));
}

function patchActivity(id: string, patch: Partial<LarpActivity>) {
    update(a => ({ ...a, list: a.list.map(x => x.id === id ? { ...x, ...patch } : x) }));
}

function patchRule(id: string, patch: Partial<LarpActivityRule>) {
    update(a => ({ ...a, rules: a.rules.map(x => x.id === id ? { ...x, ...patch } : x) }));
}

// ---- Bausteine ----

/** Dauer in Stunden, Minuten und Sekunden */
function DurationField({ value, onChange }: { value: number | undefined; onChange(v: number): void; }) {
    const total = value ?? 0;
    const parts = { h: Math.floor(total / 3600), m: Math.floor(total / 60) % 60, s: total % 60 };
    const set = (key: "h" | "m" | "s", raw: string) => {
        const n = Math.max(0, Math.min(999, Math.floor(Number(raw) || 0)));
        const next = { ...parts, [key]: n };
        onChange(next.h * 3600 + next.m * 60 + next.s);
    };
    return (
        <div className={cl("inline")}>
            {(["h", "m", "s"] as const).map(key => (
                <label key={key} className={cl("duration-part")}>
                    <input
                        className={cl("input", "input-small")}
                        type="number"
                        min={0}
                        max={key === "h" ? 999 : 59}
                        value={parts[key]}
                        onChange={e => set(key, e.currentTarget.value)}
                    />
                    <span>{t(`activity.duration.${key}`)}</span>
                </label>
            ))}
        </div>
    );
}

/** Lokale Zeitangabe („seit“, „noch“, Fortschritt) */
function TimesEditor({ value, onChange, allowProgress }: {
    value: LarpActivityTimes | undefined;
    onChange(v: LarpActivityTimes | undefined): void;
    allowProgress: boolean;
}) {
    const times = value;
    const mode = times?.mode ?? "none";
    const set = (patch: Partial<LarpActivityTimes>) => {
        const base: LarpActivityTimes = times ?? { mode: "since", live: true, seconds: 0 };
        onChange({ ...base, ...patch });
    };

    return (
        <>
            <Row label={t("activity.times.label")} hint={t("activity.times.hint")}>
                <select
                    className={cl("input", "input-medium")}
                    value={mode}
                    onChange={e => {
                        const next = e.currentTarget.value as LarpActivityTimes["mode"];
                        if (next === "none") return onChange(undefined);
                        onChange({ mode: next, live: times?.live ?? true, seconds: times?.seconds ?? 0, elapsed: times?.elapsed ?? 0, at: times?.at });
                    }}
                >
                    <option value="none">{t("activity.times.none")}</option>
                    <option value="since">{t("activity.times.since")}</option>
                    <option value="until">{t("activity.times.until")}</option>
                    {allowProgress && <option value="progress">{t("activity.times.progress")}</option>}
                </select>
            </Row>

            {mode === "progress" && (
                <>
                    <Row label={t("activity.times.total")}>
                        <DurationField value={times?.seconds} onChange={seconds => set({ seconds })} />
                    </Row>
                    <Row label={t("activity.times.elapsed")} hint={t("activity.times.progressHint")}>
                        <DurationField value={times?.elapsed} onChange={elapsed => set({ elapsed })} />
                    </Row>
                </>
            )}

            {(mode === "since" || mode === "until") && (
                <>
                    <Row label={t("activity.times.source")}>
                        <select
                            className={cl("input", "input-medium")}
                            value={times?.live === false ? "fixed" : "live"}
                            onChange={e => set({ live: e.currentTarget.value === "live" })}
                        >
                            <option value="live">{t("activity.times.live")}</option>
                            <option value="fixed">{t("activity.times.fixed")}</option>
                        </select>
                    </Row>
                    {times?.live === false ? (
                        <Row label={t("activity.times.at")}>
                            <input
                                className={cl("input")}
                                type="datetime-local"
                                value={times.at ? toLocalInput(times.at) : ""}
                                onChange={e => {
                                    const v = e.currentTarget.value;
                                    set({ at: v ? new Date(v).toISOString() : undefined });
                                }}
                            />
                        </Row>
                    ) : (
                        <Row label={mode === "since" ? t("activity.times.elapsedLive") : t("activity.times.remaining")}>
                            <DurationField value={times?.seconds} onChange={seconds => set({ seconds })} />
                        </Row>
                    )}
                </>
            )}
        </>
    );
}

/** ISO → Wert für <input type="datetime-local"> in Ortszeit */
function toLocalInput(iso: string) {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Felder, die eigene Aktivitäten und Regeln teilen */
function FieldsEditor({ value, onChange, showName, namePlaceholder }: {
    value: LarpActivityFields;
    onChange(patch: Partial<LarpActivityFields>): void;
    showName: boolean;
    namePlaceholder?: string;
}) {
    return (
        <>
            {showName && (
                <Row label={t("activity.field.name")} hint={t("activity.field.nameHint")}>
                    <TextField value={value.name} maxLength={128} placeholder={namePlaceholder} onCommit={name => onChange({ name })} />
                </Row>
            )}
            <Row label={t("activity.field.details")} hint={t("activity.field.detailsHint")}>
                <TextField value={value.details} maxLength={128} onCommit={details => onChange({ details })} />
            </Row>
            <Row label={t("activity.field.state")} hint={t("activity.field.stateHint")}>
                <TextField value={value.state} maxLength={128} onCommit={state => onChange({ state })} />
            </Row>
            <Row label={t("activity.field.largeImage")}>
                <ImageField value={value.largeImage} maxBytes={1_400_000} onCommit={largeImage => onChange({ largeImage })} />
            </Row>
            <Row label={t("activity.field.largeText")}>
                <TextField value={value.largeText} maxLength={128} onCommit={largeText => onChange({ largeText })} />
            </Row>
            <Row label={t("activity.field.smallImage")}>
                <ImageField value={value.smallImage} maxBytes={1_400_000} onCommit={smallImage => onChange({ smallImage })} />
            </Row>
            <Row label={t("activity.field.smallText")}>
                <TextField value={value.smallText} maxLength={128} onCommit={smallText => onChange({ smallText })} />
            </Row>
        </>
    );
}

// ---- Eigene Aktivitäten ----

function ActivityEditor({ activity }: { activity: LarpActivity; }) {
    const isCustomStatus = activity.type === 4;
    const patch = (p: Partial<LarpActivity>) => patchActivity(activity.id, p);

    return (
        <div className={cl("activity-editor")}>
            <Row label={t("activity.field.type")}>
                <select
                    className={cl("input", "input-medium")}
                    value={activity.type}
                    onChange={e => {
                        const type = Number(e.currentTarget.value) as LarpActivityType;
                        // Fortschrittsleiste gibt es nur bei „Hört“
                        const times = type !== 2 && activity.times?.mode === "progress" ? undefined : activity.times;
                        patch({ type, times });
                    }}
                >
                    {ACTIVITY_TYPES.map(type => <option key={type} value={type}>{typeName(type)}</option>)}
                </select>
            </Row>

            {isCustomStatus ? (
                <>
                    <Row label={t("activity.field.statusText")}>
                        <TextField value={activity.state ?? activity.name} maxLength={128} onCommit={state => patch({ state, name: state || activity.name })} />
                    </Row>
                    <Row label={t("activity.field.emoji")} hint={t("activity.field.emojiHint")}>
                        <TextField value={activity.emoji} maxLength={16} placeholder="🎭" onCommit={emoji => patch({ emoji })} />
                    </Row>
                </>
            ) : (
                <>
                    <FieldsEditor value={activity} showName onChange={p => patch(p)} />

                    <Row label={t("activity.field.party")} hint={t("activity.field.partyHint")}>
                        <div className={cl("inline")}>
                            <input
                                className={cl("input", "input-small")}
                                type="number"
                                min={0}
                                max={999999}
                                value={activity.party?.[0] ?? ""}
                                placeholder="2"
                                onChange={e => {
                                    const v = e.currentTarget.value;
                                    if (!v) return patch({ party: undefined });
                                    const max = activity.party?.[1] || Math.max(1, Number(v));
                                    patch({ party: [Math.max(0, Number(v)), max] });
                                }}
                            />
                            <span className={cl("muted")}>{t("activity.field.partyOf")}</span>
                            <input
                                className={cl("input", "input-small")}
                                type="number"
                                min={1}
                                max={999999}
                                value={activity.party?.[1] ?? ""}
                                placeholder="4"
                                onChange={e => {
                                    const v = e.currentTarget.value;
                                    if (!v) return patch({ party: undefined });
                                    patch({ party: [activity.party?.[0] ?? 1, Math.max(1, Number(v))] });
                                }}
                            />
                            {activity.party && <Btn variant="danger" title={t("common.remove")} aria-label={t("common.remove")} onClick={() => patch({ party: undefined })}>✕</Btn>}
                        </div>
                    </Row>

                    <Row label={t("activity.field.buttons")} hint={t("activity.field.buttonsHint")}>
                        <div className={cl("inline")}>
                            {[0, 1].map(i => (
                                <TextField
                                    key={i}
                                    value={activity.buttons?.[i]}
                                    maxLength={32}
                                    placeholder={t("activity.field.buttonPlaceholder", { number: i + 1 })}
                                    onCommit={v => {
                                        const next = [...(activity.buttons ?? [])];
                                        next[i] = v ?? "";
                                        const cleaned = next.filter(Boolean);
                                        patch({ buttons: cleaned.length ? cleaned : undefined });
                                    }}
                                />
                            ))}
                        </div>
                    </Row>

                    <TimesEditor value={activity.times} allowProgress={activity.type === 2} onChange={times => patch({ times })} />
                </>
            )}
        </div>
    );
}

function OwnActivities({ cfg }: { cfg: LarpActivities; }) {
    const [open, setOpen] = useState<string>();

    const add = () => {
        const id = newId();
        update(a => ({ ...a, list: [...a.list, { id, enabled: true, type: 0, name: t("activity.newName") }] }));
        setOpen(id);
    };

    return (
        <Section title={t("activity.own.title")} description={t("activity.own.description")}>
            <Toggle
                label={t("activity.own.enabled")}
                hint={t("common.localOnly")}
                value={cfg.enabled}
                onChange={enabled => update(a => ({ ...a, enabled }))}
            />

            <div className={cl("activity-list")}>
                {cfg.list.map(a => (
                    <div key={a.id} className={cl("activity-item", a.enabled && "activity-item-on")}>
                        <div className={cl("activity-head")}>
                            <label className={cl("check")}>
                                <input type="checkbox" checked={a.enabled} onChange={e => patchActivity(a.id, { enabled: e.currentTarget.checked })} />
                                <span className={cl("activity-title")}>{a.type === 4 ? (a.state || a.name) : a.name}</span>
                            </label>
                            <span className={cl("activity-type")}>{typeName(a.type)}</span>
                            <Btn variant="secondary" onClick={() => setOpen(open === a.id ? undefined : a.id)}>
                                {open === a.id ? t("common.done") : t("common.edit")}
                            </Btn>
                            <Btn variant="danger" title={t("common.delete")} aria-label={t("common.delete")} onClick={() => update(x => ({ ...x, list: x.list.filter(y => y.id !== a.id) }))}>✕</Btn>
                        </div>
                        {open === a.id && <ActivityEditor activity={a} />}
                    </div>
                ))}
            </div>

            <div className={cl("inline")} style={{ marginTop: 8 }}>
                <Btn onClick={add} disabled={cfg.list.length >= 10}>{t("activity.own.add")}</Btn>
            </div>
        </Section>
    );
}

// ---- Aktivitäts-Changer ----

function RuleEditor({ rule }: { rule: LarpActivityRule; }) {
    return (
        <div className={cl("activity-editor")}>
            <Toggle label={t("activity.rule.hide")} hint={t("activity.rule.hideHint")} value={!!rule.hide} onChange={hide => patchRule(rule.id, { hide })} />
            {!rule.hide && (
                <>
                    <FieldsEditor value={rule} showName namePlaceholder={rule.label} onChange={p => patchRule(rule.id, p)} />
                    <TimesEditor value={rule.times} allowProgress={false} onChange={times => patchRule(rule.id, { times })} />
                    <p className={cl("muted")}>{t("activity.rule.emptyFieldsHint")}</p>
                </>
            )}
        </div>
    );
}

function Rules({ cfg }: { cfg: LarpActivities; }) {
    const [open, setOpen] = useState<string>();
    const [manual, setManual] = useState("");
    const detected = detectedActivities();
    const known = new Set(cfg.rules.map(r => r.match));

    const addRule = (match: string, label?: string) => {
        const key = match.trim().toLowerCase();
        if (!key) return;
        const existing = cfg.rules.find(r => r.match === key);
        if (existing) return setOpen(existing.id);
        const id = newId();
        update(a => ({ ...a, rules: [...a.rules, { id, enabled: true, match: key, label: label ?? match.trim() }] }));
        setOpen(id);
    };

    return (
        <Section title={t("activity.rules.title")} description={t("activity.rules.description")}>
            {detected.length > 0 && (
                <div className={cl("activity-detected")}>
                    <small className={cl("muted")}>{t("activity.rules.detected")}</small>
                    <div className={cl("inline")}>
                        {detected.map(d => (
                            <Btn
                                key={d.match}
                                variant="secondary"
                                disabled={known.has(d.match)}
                                onClick={() => addRule(d.match, d.label)}
                            >
                                {d.label}
                            </Btn>
                        ))}
                    </div>
                </div>
            )}

            <div className={cl("activity-list")}>
                {cfg.rules.map(r => (
                    <div key={r.id} className={cl("activity-item", r.enabled && "activity-item-on")}>
                        <div className={cl("activity-head")}>
                            <label className={cl("check")}>
                                <input type="checkbox" checked={r.enabled} onChange={e => patchRule(r.id, { enabled: e.currentTarget.checked })} />
                                <span className={cl("activity-title")}>{r.label || r.match}</span>
                            </label>
                            <span className={cl("activity-type")}>{r.hide ? t("activity.rule.hidden") : t("activity.rule.changed")}</span>
                            <Btn variant="secondary" onClick={() => setOpen(open === r.id ? undefined : r.id)}>
                                {open === r.id ? t("common.done") : t("common.edit")}
                            </Btn>
                            <Btn variant="danger" title={t("common.delete")} aria-label={t("common.delete")} onClick={() => update(x => ({ ...x, rules: x.rules.filter(y => y.id !== r.id) }))}>✕</Btn>
                        </div>
                        {open === r.id && <RuleEditor rule={r} />}
                    </div>
                ))}
            </div>

            <div className={cl("activity-manual")}>
                <strong>{t("activity.rules.manual")}</strong>
                <small>{t("activity.rules.manualHint")}</small>
                <div className={cl("inline")}>
                    <input
                        className={cl("input")}
                        value={manual}
                        placeholder={t("activity.rules.manualPlaceholder")}
                        onChange={e => setManual(e.currentTarget.value)}
                        onKeyDown={e => {
                            if (e.key !== "Enter") return;
                            addRule(manual);
                            setManual("");
                        }}
                    />
                    <Btn onClick={() => { addRule(manual); setManual(""); }} disabled={!manual.trim() || cfg.rules.length >= 30}>{t("common.add")}</Btn>
                </div>
            </div>
        </Section>
    );
}

export function ActivityTab() {
    useLarpLocale();
    const larp = useLarpProfile();
    const cfg = larp.activities ?? EMPTY;

    return (
        <>
            <OwnActivities cfg={cfg} />
            <Section title={t("activity.preview.title")} description={t("activity.preview.description")}>
                <ActivityPreview cfg={cfg} />
            </Section>
            <Rules cfg={cfg} />
        </>
    );
}
