/*
 * Larpcord, a standalone Discord client for local cosmetic larping
 * Copyright (c) 2026 Larpcord contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import ErrorBoundary from "@components/ErrorBoundary";
import { cl } from "@plugins/larpCore/hub/components";
import { formatLarpNumber, t } from "@plugins/larpCore/i18n";
import { LarpActivities, LarpActivity } from "@plugins/larpCore/types";
import { useEffect, useState } from "@webpack/common";

import { toDiscordActivity } from "./activities";

/*
 * Eigene Vorschau (keine Discord-Komponente): So bleibt der Hub auch dann benutzbar, wenn
 * Discord seine Aktivitätskarte umbaut. Gezeigt wird, wie die Aktivität im Profil
 * und als Zeile in der Mitgliederliste aussieht.
 */

/** Sekunden als m:ss bzw. h:mm:ss */
function clock(totalSeconds: number) {
    const s = Math.max(0, Math.floor(totalSeconds));
    const h = Math.floor(s / 3600), m = Math.floor(s / 60) % 60, sec = s % 60;
    const pad = (n: number) => String(n).padStart(2, "0");
    return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`;
}

/** Sekundengenauer Takt für laufende Zeiten */
function useTick() {
    const [, setTick] = useState(0);
    useEffect(() => {
        const id = setInterval(() => setTick(x => x + 1), 1000);
        return () => clearInterval(id);
    }, []);
    return Date.now();
}

function timeText(activity: LarpActivity, now: number) {
    const built = toDiscordActivity(activity);
    const stamps = built.timestamps;
    if (!stamps) return undefined;
    if (stamps.end != null && stamps.start != null) return `${clock((now - stamps.start) / 1000)} / ${clock((stamps.end - stamps.start) / 1000)}`;
    if (stamps.end != null) return t("activity.preview.left", { time: clock((stamps.end - now) / 1000) });
    if (stamps.start != null) return t("activity.preview.elapsed", { time: clock((now - stamps.start) / 1000) });
    return undefined;
}

function progressPercent(activity: LarpActivity, now: number) {
    const stamps = toDiscordActivity(activity).timestamps;
    if (!stamps?.start || !stamps.end || stamps.end <= stamps.start) return undefined;
    const done = (Math.min(now, stamps.end) - stamps.start) / (stamps.end - stamps.start);
    return Math.max(0, Math.min(100, done * 100));
}

/** Zeile, wie sie in Mitgliederliste, DM-Liste und User-Panel erscheint */
export function activityLine(activity: LarpActivity) {
    if (activity.type === 4) return `${activity.emoji ? activity.emoji + " " : ""}${activity.state || activity.name}`;
    return t(`activity.line.${activity.type}`, { name: activity.name }); // i18n-keys: activity.line.*
}

function Card({ activity, now }: { activity: LarpActivity; now: number; }) {
    if (activity.type === 4) {
        return (
            <div className={cl("act-card", "act-card-status")}>
                <span className={cl("act-status")}>{activityLine(activity)}</span>
            </div>
        );
    }

    const time = timeText(activity, now);
    const percent = activity.times?.mode === "progress" ? progressPercent(activity, now) : undefined;
    const party = activity.party ? t("activity.preview.party", { current: formatLarpNumber(activity.party[0]), max: formatLarpNumber(activity.party[1]) }) : undefined;

    return (
        <div className={cl("act-card")}>
            <div className={cl("act-header")}>{t(`activity.header.${activity.type}`)}</div>
            <div className={cl("act-body")}>
                <div className={cl("act-images")}>
                    {activity.largeImage
                        ? <img className={cl("act-large")} src={activity.largeImage} alt={activity.largeText ?? ""} title={activity.largeText} />
                        : <div className={cl("act-large", "act-large-empty")} />}
                    {activity.smallImage && <img className={cl("act-small")} src={activity.smallImage} alt={activity.smallText ?? ""} title={activity.smallText} />}
                </div>
                <div className={cl("act-text")}>
                    <strong>{activity.name}</strong>
                    {activity.details && <span>{activity.details}</span>}
                    {(activity.state || party) && <span>{[activity.state, party].filter(Boolean).join(" ")}</span>}
                    {percent != null && (
                        <div className={cl("act-bar")}><div className={cl("act-bar-fill")} style={{ width: `${percent}%` }} /></div>
                    )}
                    {time && <span className={cl("act-time")}>{time}</span>}
                </div>
            </div>
            {activity.buttons?.length ? (
                <div className={cl("act-buttons")}>
                    {activity.buttons.map((b, i) => <span key={i} className={cl("act-button")}>{b}</span>)}
                </div>
            ) : null}
        </div>
    );
}

function Preview({ cfg }: { cfg: LarpActivities; }) {
    const now = useTick();
    const active = cfg.enabled ? cfg.list.filter(a => a.enabled) : [];

    if (!active.length) return <p className={cl("muted")}>{t("activity.preview.empty")}</p>;

    return (
        <div className={cl("act-preview")}>
            {active.map(a => <Card key={a.id} activity={a} now={now} />)}
            <div className={cl("act-memberlist")}>
                <small className={cl("muted")}>{t("activity.preview.memberList")}</small>
                {active.map(a => <div key={a.id} className={cl("act-memberline")}>{activityLine(a)}</div>)}
            </div>
        </div>
    );
}

export const ActivityPreview = ErrorBoundary.wrap(Preview, { noop: true });
