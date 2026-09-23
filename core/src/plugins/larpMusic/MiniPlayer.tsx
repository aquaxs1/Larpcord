/*
 * Larpcord, a standalone Discord client for local cosmetic larping
 * Copyright (c) 2026 Larpcord contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import ErrorBoundary from "@components/ErrorBoundary";
import { t, useLarpLocale } from "@plugins/larpCore/i18n";
import { LarpStore, useLarpProfile } from "@plugins/larpCore/store";
import { useEffect, useReducer } from "@webpack/common";

import { acquire, isPaused, onPlayerChange, release, songTitle, togglePause } from "./audio";

/*
 * Mini-Player im eigenen Profil. Solange diese Komponente sichtbar ist (Popout oder
 * Profil-Fenster offen), läuft die Musik – beim Schließen wird sie wieder gestoppt.
 */

function Player() {
    const larp = useLarpProfile();
    useLarpLocale();
    const [, forceUpdate] = useReducer((x: number) => x + 1, 0);

    useEffect(() => onPlayerChange(forceUpdate), []);
    useEffect(() => {
        acquire();
        return release;
    }, []);

    const { music } = larp;
    if (!music?.enabled || !music.source) return null;

    const title = songTitle(music) ?? "";
    const paused = music.muted || isPaused();

    return (
        <span className="larp-music-player">
            <button
                className="larp-music-button"
                title={paused ? t("music.player.play") : t("music.player.pause")}
                aria-label={paused ? t("music.player.play") : t("music.player.pause")}
                onClick={e => {
                    e.stopPropagation();
                    togglePause();
                }}
            >
                {paused ? "▶" : "⏸"}
            </button>
            <span className="larp-music-title" title={title}>{title}</span>
            <button
                className="larp-music-button"
                title={t("music.mute")}
                aria-label={t("music.mute")}
                aria-pressed={music.muted}
                onClick={e => {
                    e.stopPropagation();
                    LarpStore.update(p => ({ music: { ...p.music!, muted: !music.muted } }));
                }}
            >
                {music.muted ? "🔇" : "🔊"}
            </button>
        </span>
    );
}

export const MiniPlayer = ErrorBoundary.wrap(Player, { noop: true });
