/*
 * Larpcord, a standalone Discord client for local cosmetic larping
 * Copyright (c) 2026 Larpcord contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { Btn, cl, ColorField, readAsDataUrl, Row, Section, TextField, Toggle } from "@plugins/larpCore/hub/components";
import { formatLarpNumber, t, useLarpLocale } from "@plugins/larpCore/i18n";
import { LarpStore, useLarpProfile } from "@plugins/larpCore/store";
import { LarpSounds, LarpTheme } from "@plugins/larpCore/types";
import { chooseFile } from "@utils/web";
import { SettingsRouter, showToast, Toasts, useState } from "@webpack/common";

import { DEFAULT_THEME } from "./themeCss";

const MAX_SOUND_BYTES = 1_400_000;
const MAX_SOUND_MB = MAX_SOUND_BYTES / 1_000_000;

function updateTheme(patch: Partial<LarpTheme>) {
    LarpStore.update(p => ({ theme: { ...DEFAULT_THEME, ...p.theme, enabled: p.theme?.enabled ?? false, ...patch } }));
}

function ThemePreview({ theme }: { theme: LarpTheme; }) {
    const r = theme.radius ?? 8;
    return (
        <div className={cl("theme-preview")} style={{ background: theme.backgroundSecondary, borderRadius: r * 1.5, fontFamily: theme.font ? `"${theme.font}", var(--font-primary)` : undefined }}>
            <div style={{ background: theme.background, borderRadius: r, padding: 12, color: theme.text }}>
                <b>Larpcord</b>
                <p style={{ margin: "6px 0 10px", opacity: 0.75 }}>{t("themes.preview.text")}</p>
                <span style={{ background: theme.accent, color: "#fff", borderRadius: r / 2 + 2, padding: "4px 10px", fontSize: 13 }}>{t("themes.preview.button")}</span>
            </div>
        </div>
    );
}

function SoundRow({ kind, label, value }: { kind: keyof LarpSounds; label: string; value?: string; }) {
    const [audio] = useState(() => new Audio());

    const pick = async () => {
        const file = await chooseFile("audio/mpeg,audio/ogg,audio/wav,audio/webm,audio/mp4");
        if (!file) return;
        if (file.size > MAX_SOUND_BYTES) return showToast(t("themes.sounds.tooLarge", { size: formatLarpNumber(MAX_SOUND_MB) }), Toasts.Type.FAILURE);
        const url = await readAsDataUrl(file);
        if (!url.startsWith("data:audio/")) return showToast(t("themes.sounds.notAudio"), Toasts.Type.FAILURE);
        LarpStore.update(p => ({ sounds: { ...p.sounds, [kind]: url } }));
    };

    const play = () => {
        if (!value) return;
        audio.src = value;
        audio.currentTime = 0;
        audio.play().catch(() => showToast(t("themes.sounds.playFailed"), Toasts.Type.FAILURE));
    };

    return (
        <Row label={label} hint={value ? t("themes.sounds.customActive") : t("themes.sounds.discordDefault")}>
            <div className={cl("inline")}>
                <Btn variant="secondary" onClick={pick}>{t("common.chooseFile")}</Btn>
                {value && <Btn variant="secondary" onClick={play}>▶</Btn>}
                {value && <Btn variant="danger" onClick={() => LarpStore.update(p => ({ sounds: { ...p.sounds, [kind]: undefined } }))}>✕</Btn>}
            </div>
        </Row>
    );
}

export function ThemesTab() {
    useLarpLocale();
    const larp = useLarpProfile();
    const theme: LarpTheme = { ...DEFAULT_THEME, ...larp.theme, enabled: larp.theme?.enabled ?? false };

    return (
        <>
            <Section title={t("themes.editor.title")} description={t("themes.editor.description")}>
                <Toggle label={t("themes.editor.enabled")} value={theme.enabled} onChange={enabled => updateTheme({ enabled })} />
                <Row label={t("themes.editor.accent")}><ColorField value={theme.accent} onChange={accent => updateTheme({ accent })} /></Row>
                <Row label={t("themes.editor.background")}><ColorField value={theme.background} onChange={background => updateTheme({ background })} /></Row>
                <Row label={t("themes.editor.sidebars")}><ColorField value={theme.backgroundSecondary} onChange={backgroundSecondary => updateTheme({ backgroundSecondary })} /></Row>
                <Row label={t("themes.editor.text")}><ColorField value={theme.text} onChange={text => updateTheme({ text })} /></Row>
                <Row label={t("themes.editor.font")} hint={t("themes.editor.fontHint")}>
                    {/* Platzhalter ist der Name von Discords Standardschrift, nicht übersetzen */}
                    <TextField value={theme.font} placeholder="gg sans" maxLength={80} onCommit={font => updateTheme({ font })} />
                </Row>
                <Row label={t("themes.editor.radius")} hint={`${theme.radius ?? 8} px`}>
                    <input type="range" min={0} max={24} value={theme.radius ?? 8} onChange={e => updateTheme({ radius: Number(e.currentTarget.value) })} />
                </Row>
                <ThemePreview theme={theme} />
                {larp.theme && <Btn variant="danger" style={{ marginTop: 12 }} onClick={() => LarpStore.update({ theme: undefined })}>{t("themes.editor.reset")}</Btn>}
            </Section>

            <Section title={t("themes.sounds.title")} description={t("themes.sounds.description")}>
                <SoundRow kind="message" label={t("themes.sounds.message")} value={larp.sounds?.message} />
                <SoundRow kind="call" label={t("themes.sounds.call")} value={larp.sounds?.call} />
            </Section>

            {IS_VESKTOP && (
                <Section title={t("themes.appAssets.title")} description={t("themes.appAssets.description")}>
                    <Btn variant="secondary" onClick={() => SettingsRouter.openUserSettings("vesktop_panel")}>{t("themes.appAssets.open")}</Btn>
                </Section>
            )}
        </>
    );
}
