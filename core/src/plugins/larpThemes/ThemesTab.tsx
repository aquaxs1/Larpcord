/*
 * Larpcord, a standalone Discord client for local cosmetic larping
 * Copyright (c) 2026 Larpcord contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { Btn, cl, ColorField, readAsDataUrl, Row, Section, TextField, Toggle } from "@plugins/larpCore/hub/components";
import { LarpStore, useLarpProfile } from "@plugins/larpCore/store";
import { LarpSounds, LarpTheme } from "@plugins/larpCore/types";
import { chooseFile } from "@utils/web";
import { SettingsRouter, showToast, Toasts, useState } from "@webpack/common";

import { DEFAULT_THEME } from "./themeCss";

const MAX_SOUND_BYTES = 1_400_000;

function updateTheme(patch: Partial<LarpTheme>) {
    LarpStore.update(p => ({ theme: { ...DEFAULT_THEME, ...p.theme, enabled: p.theme?.enabled ?? false, ...patch } }));
}

function ThemePreview({ theme }: { theme: LarpTheme; }) {
    const r = theme.radius ?? 8;
    return (
        <div className={cl("theme-preview")} style={{ background: theme.backgroundSecondary, borderRadius: r * 1.5, fontFamily: theme.font ? `"${theme.font}", var(--font-primary)` : undefined }}>
            <div style={{ background: theme.background, borderRadius: r, padding: 12, color: theme.text }}>
                <b>Larpcord</b>
                <p style={{ margin: "6px 0 10px", opacity: 0.75 }}>So ungefähr sieht dein Theme aus.</p>
                <span style={{ background: theme.accent, color: "#fff", borderRadius: r / 2 + 2, padding: "4px 10px", fontSize: 13 }}>Button</span>
            </div>
        </div>
    );
}

function SoundRow({ kind, label, value }: { kind: keyof LarpSounds; label: string; value?: string; }) {
    const [audio] = useState(() => new Audio());

    const pick = async () => {
        const file = await chooseFile("audio/mpeg,audio/ogg,audio/wav,audio/webm,audio/mp4");
        if (!file) return;
        if (file.size > MAX_SOUND_BYTES) return showToast("Datei zu groß (max. 1,4 MB)", Toasts.Type.FAILURE);
        const url = await readAsDataUrl(file);
        if (!url.startsWith("data:audio/")) return showToast("Das ist keine Audiodatei", Toasts.Type.FAILURE);
        LarpStore.update(p => ({ sounds: { ...p.sounds, [kind]: url } }));
    };

    const play = () => {
        if (!value) return;
        audio.src = value;
        audio.currentTime = 0;
        audio.play().catch(() => showToast("Konnte nicht abgespielt werden", Toasts.Type.FAILURE));
    };

    return (
        <Row label={label} hint={value ? "Eigene Datei aktiv" : "Discord-Standard"}>
            <div className={cl("inline")}>
                <Btn variant="secondary" onClick={pick}>Datei…</Btn>
                {value && <Btn variant="secondary" onClick={play}>▶</Btn>}
                {value && <Btn variant="danger" onClick={() => LarpStore.update(p => ({ sounds: { ...p.sounds, [kind]: undefined } }))}>✕</Btn>}
            </div>
        </Row>
    );
}

export function ThemesTab() {
    const larp = useLarpProfile();
    const theme: LarpTheme = { ...DEFAULT_THEME, ...larp.theme, enabled: larp.theme?.enabled ?? false };

    return (
        <>
            <Section title="Theme-Editor" description="Änderungen wirken sofort im ganzen Client. Das Theme wird mit deinen Presets gespeichert.">
                <Toggle label="Larpcord-Theme aktiv" value={theme.enabled} onChange={enabled => updateTheme({ enabled })} />
                <Row label="Akzentfarbe"><ColorField value={theme.accent} onChange={accent => updateTheme({ accent })} /></Row>
                <Row label="Hintergrund"><ColorField value={theme.background} onChange={background => updateTheme({ background })} /></Row>
                <Row label="Seitenleisten"><ColorField value={theme.backgroundSecondary} onChange={backgroundSecondary => updateTheme({ backgroundSecondary })} /></Row>
                <Row label="Text"><ColorField value={theme.text} onChange={text => updateTheme({ text })} /></Row>
                <Row label="Schriftart" hint="Name einer installierten Schrift, z. B. „Comic Sans MS“">
                    <TextField value={theme.font} placeholder="gg sans" maxLength={80} onCommit={font => updateTheme({ font })} />
                </Row>
                <Row label="Eckenradius" hint={`${theme.radius ?? 8} px`}>
                    <input type="range" min={0} max={24} value={theme.radius ?? 8} onChange={e => updateTheme({ radius: Number(e.currentTarget.value) })} />
                </Row>
                <ThemePreview theme={theme} />
                {larp.theme && <Btn variant="danger" style={{ marginTop: 12 }} onClick={() => LarpStore.update({ theme: undefined })}>Theme zurücksetzen</Btn>}
            </Section>

            <Section title="Sounds" description="Eigene Audiodateien (MP3, OGG, WAV) statt Discords Standard-Sounds.">
                <SoundRow kind="message" label="Nachricht" value={larp.sounds?.message} />
                <SoundRow kind="call" label="Anruf (Klingeln)" value={larp.sounds?.call} />
            </Section>

            {IS_VESKTOP && (
                <Section title="Ladebildschirm & App-Icon" description="Eigenes Bild und eigener Text im Ladebildschirm sowie ein eigenes Fenster-Icon.">
                    <Btn variant="secondary" onClick={() => SettingsRouter.openUserSettings("vesktop_panel")}>Larpcord Desktop öffnen → Customize App Assets</Btn>
                </Section>
            )}
        </>
    );
}
