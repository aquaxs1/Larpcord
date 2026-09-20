/*
 * Larpcord, a standalone Discord client for local cosmetic larping
 * Copyright (c) 2026 Larpcord contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { useState } from "@webpack/common";

import { formatLarpDate, t, useLarpLocale } from "../i18n";
import { checkForUpdates, installUpdateNow, isUpdaterAvailable, LarpUpdateChannel, LarpUpdaterStatus, setUpdaterOptions, useUpdaterStatus } from "../updater/client";
import { openUpdateModal } from "../updater/UpdateModal";
import { Btn, cl, Row, Section, Toggle } from "./components";

function StatusLine({ status }: { status: LarpUpdaterStatus; }) {
    const version = status.update?.version ?? "";
    switch (status.state) {
        case "checking":
            return <span>{t("core.updates.stateChecking")}</span>;
        case "not-available":
            return <span>{t("core.updates.stateUpToDate")}</span>;
        case "downloading":
            return <span>{t("core.updates.stateDownloading", { version, progress: status.progress ?? 0 })}</span>;
        case "downloaded":
            return <span className={cl("update-ready")}>{t("core.updates.stateDownloaded", { version })}</span>;
        case "error":
            return <span className={cl("muted")}>{t("core.updates.stateError", { error: status.error ?? "?" })}</span>;
        case "unsupported":
            return <span className={cl("muted")}>{t("core.updates.stateUnsupported")}</span>;
        default:
            return <span className={cl("muted")}>{t("core.updates.stateIdle")}</span>;
    }
}

export function UpdatesTab() {
    useLarpLocale();
    const status = useUpdaterStatus();
    const [busy, setBusy] = useState(false);

    if (!isUpdaterAvailable() || !status) {
        return (
            <Section title={t("core.updates.title")}>
                <p className={cl("muted")}>{t("core.updates.notAvailable")}</p>
            </Section>
        );
    }

    const unsupported = status.state === "unsupported";
    const channel = status.channel;
    const setChannel = (c: LarpUpdateChannel) => c !== channel && void setUpdaterOptions({ channel: c });

    return (
        <>
            <Section title={t("core.updates.title")} description={t("core.updates.description")}>
                <Row label={t("core.updates.currentVersion")}>
                    <code className={cl("update-version")}>v{status.currentVersion}</code>
                </Row>

                <Toggle
                    label={t("core.updates.autoUpdate")}
                    hint={t("core.updates.autoUpdateHint")}
                    value={status.autoUpdate}
                    onChange={v => void setUpdaterOptions({ autoUpdate: v })}
                />

                <Row label={t("core.updates.channel")} hint={t("core.updates.channelHint")}>
                    <div className={cl("segmented")} role="radiogroup" aria-label={t("core.updates.channel")}>
                        {(["stable", "beta"] as const).map(c => (
                            <button
                                key={c}
                                role="radio"
                                aria-checked={channel === c}
                                className={cl("segment", channel === c && "segment-active")}
                                onClick={() => setChannel(c)}
                            >
                                {c === "stable" ? t("core.updates.channelStable") : t("core.updates.channelBeta")}
                            </button>
                        ))}
                    </div>
                </Row>
            </Section>

            <Section title={t("core.updates.statusTitle")}>
                <Row
                    label={<StatusLine status={status} />}
                    hint={status.lastCheck ? t("core.updates.lastCheck", { time: formatLarpDate(status.lastCheck, { dateStyle: "medium", timeStyle: "short" }) }) : undefined}
                >
                    {status.state === "downloaded" ? (
                        <div className={cl("btn-row")}>
                            <Btn variant="secondary" onClick={() => openUpdateModal(status)}>{t("core.updates.showChangelog")}</Btn>
                            <Btn onClick={() => void installUpdateNow()}>{t("core.updates.restartNow")}</Btn>
                        </div>
                    ) : (
                        <Btn
                            disabled={unsupported || busy || status.state === "checking" || status.state === "downloading"}
                            onClick={async () => {
                                setBusy(true);
                                try {
                                    await checkForUpdates();
                                } finally {
                                    setBusy(false);
                                }
                            }}
                        >
                            {t("core.updates.checkNow")}
                        </Btn>
                    )}
                </Row>
                {status.state === "downloading" && (
                    <div className={cl("progress")} role="progressbar" aria-valuenow={status.progress ?? 0} aria-valuemin={0} aria-valuemax={100}>
                        <div className={cl("progress-bar")} style={{ width: `${status.progress ?? 0}%` }} />
                    </div>
                )}
                <small className={cl("muted")}>{t("core.updates.smartScreenHint")}</small>
            </Section>
        </>
    );
}
