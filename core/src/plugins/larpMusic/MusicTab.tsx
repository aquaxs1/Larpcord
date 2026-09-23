/*
 * Larpcord, a standalone Discord client for local cosmetic larping
 * Copyright (c) 2026 Larpcord contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Btn, cl, Row, Section, TextField, Toggle } from "@plugins/larpCore/hub/components";
import { t, useLarpLocale } from "@plugins/larpCore/i18n";
import { LarpStore, useLarpProfile } from "@plugins/larpCore/store";
import { LarpMusic } from "@plugins/larpCore/types";
import { useEffect, useState } from "@webpack/common";

import { acquire, isPlaying, onPlayerChange, release, songTitle, sourceUrl } from "./audio";

const DEFAULTS: LarpMusic = { enabled: true, muted: false, volume: 50, start: 0, loop: true, fade: 2 };

function update(patch: Partial<LarpMusic>) {
    LarpStore.update(p => ({ music: { ...DEFAULTS, ...p.music, ...patch } }));
}

/** Datei über den Desktop-Teil auswählen. Im Browser gibt es nur URLs. */
function FilePicker({ music }: { music: LarpMusic; }) {
    // Nur den Fehlerschlüssel merken, den Text erst beim Rendern übersetzen (Sprachwechsel)
    const [error, setError] = useState<string>();
    const native = IS_VESKTOP ? VesktopNative?.larpcord?.music : undefined;

    if (!native) return <p className={cl("muted")}>{t("music.desktopOnly")}</p>;

    const pick = async () => {
        setError(undefined);
        try {
            const result = await native.choose();
            if ("error" in result) {
                if (result.error !== "cancelled") setError(result.error);
                return;
            }
            update({ source: { kind: "file", id: result.id, title: result.title } });
        } catch {
            setError("read");
        }
    };

    const current = music.source?.kind === "file" ? music.source : undefined;

    return (
        <div className={cl("field")}>
            <div className={cl("inline")}>
                <Btn onClick={pick}>{t("music.chooseFile")}</Btn>
                <span className={cl("muted")}>{current ? (current.title ?? current.id) : t("music.noFile")}</span>
                {current && (
                    <Btn
                        variant="danger"
                        onClick={async () => {
                            await native.remove(current.id!).catch(() => false);
                            update({ source: undefined });
                        }}
                    >
                        {t("music.delete")}
                    </Btn>
                )}
            </div>
            {/* i18n-keys: music.error* (size, format, read, write) */}
            {error && <small className={cl("error")}>{t(`music.error${error[0].toUpperCase()}${error.slice(1)}`)}</small>}
            <small className={cl("muted")}>{t("music.fileHint")}</small>
        </div>
    );
}

export function MusicTab() {
    useLarpLocale();
    const larp = useLarpProfile();
    const music = { ...DEFAULTS, ...larp.music };
    const [, setTick] = useState(0);
    // Vorschau im Hub: hält den Player offen, solange der Knopf aktiv ist
    const [preview, setPreview] = useState(false);
    useEffect(() => onPlayerChange(() => setTick(x => x + 1)), []);
    useEffect(() => () => {
        if (preview) release();
    }, [preview]);

    const kind = music.source?.kind ?? (IS_VESKTOP ? "file" : "url");
    const playable = !!sourceUrl(music.source);

    return (
        <Section title={t("music.title")} description={t("music.description")}>
            <Toggle label={t("music.enabled")} hint={t("common.localOnly")} value={music.enabled} onChange={enabled => update({ enabled })} />
            <Toggle label={t("music.mute")} hint={t("music.muteHint")} value={music.muted} onChange={muted => update({ muted })} />

            <Row label={t("music.source")}>
                <select
                    className={cl("input", "input-medium")}
                    value={kind}
                    onChange={e => update({ source: undefined, ...(e.currentTarget.value === "url" ? { source: { kind: "url", url: "" } } : {}) })}
                >
                    <option value="file">{t("music.sourceFile")}</option>
                    <option value="url">{t("music.sourceUrl")}</option>
                </select>
            </Row>

            {kind === "file"
                ? <FilePicker music={music} />
                : (
                    <Row label={t("music.urlLabel")}>
                        <TextField
                            value={music.source?.kind === "url" ? music.source.url : undefined}
                            placeholder="https://…/song.mp3"
                            onCommit={url => update({ source: url ? { kind: "url", url, title: music.source?.title } : undefined })}
                        />
                    </Row>
                )}

            <Row label={t("music.songTitle")}>
                <TextField
                    value={music.source?.title}
                    maxLength={120}
                    placeholder={songTitle(music) ?? ""}
                    onCommit={title => music.source && update({ source: { ...music.source, title } })}
                />
            </Row>

            <Row label={t("music.volume")} hint={`${music.volume} %`}>
                <input
                    className={cl("range")}
                    type="range"
                    min={0}
                    max={100}
                    value={music.volume}
                    onChange={e => update({ volume: Number(e.currentTarget.value) })}
                />
            </Row>
            <Row label={t("music.start")} hint={t("music.startHint")}>
                <input
                    className={cl("input", "input-small")}
                    type="number"
                    min={0}
                    max={86400}
                    value={music.start}
                    onChange={e => update({ start: Math.max(0, Math.floor(Number(e.currentTarget.value) || 0)) })}
                />
            </Row>
            <Toggle label={t("music.loop")} value={music.loop} onChange={loop => update({ loop })} />
            <Row label={t("music.fade")} hint={t("music.fadeHint")}>
                <input
                    className={cl("input", "input-small")}
                    type="number"
                    min={0}
                    max={30}
                    value={music.fade}
                    onChange={e => update({ fade: Math.max(0, Math.min(30, Math.floor(Number(e.currentTarget.value) || 0))) })}
                />
            </Row>

            {playable && (
                <div className={cl("inline")} style={{ marginTop: 8 }}>
                    <Btn
                        variant="secondary"
                        onClick={() => {
                            if (preview) {
                                release();
                                setPreview(false);
                            } else {
                                acquire();
                                setPreview(true);
                            }
                        }}
                    >
                        {preview ? t("music.player.pause") : t("music.preview")}
                    </Btn>
                    {isPlaying() && <span className={cl("muted")}>♪ {songTitle(music)}</span>}
                </div>
            )}
        </Section>
    );
}
