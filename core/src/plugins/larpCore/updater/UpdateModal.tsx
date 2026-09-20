/*
 * Larpcord, a standalone Discord client for local cosmetic larping
 * Copyright (c) 2026 Larpcord contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { showNotice } from "@api/Notices";
import ErrorBoundary from "@components/ErrorBoundary";
import type { RenderModalProps } from "@vencord/discord-types";
import { Modal, openModal } from "@webpack/common";

import { cl } from "../hub/components";
import { t, useLarpLocale } from "../i18n";
import { LARPCORD_LOGO } from "../logo";
import { logger } from "../store";
import { dismissUpdate, installUpdateNow, LarpUpdaterStatus, onUpdaterStatus } from "./client";
import { renderReleaseNotes } from "./releaseNotes";

function UpdateModal({ modalProps, status }: { modalProps: RenderModalProps; status: LarpUpdaterStatus; }) {
    useLarpLocale();
    const version = status.update?.version ?? "?";
    const notes = renderReleaseNotes(status.update?.releaseNotes);

    return (
        <Modal
            {...modalProps}
            size="md"
            title={t("core.updates.modalTitle")}
            subtitle={t("core.updates.modalSubtitle", { version })}
            actions={[
                { text: t("core.updates.later"), variant: "secondary", onClick: modalProps.onClose },
                { text: t("core.updates.restartNow"), variant: "primary", onClick: () => void installUpdateNow() }
            ]}
        >
            <div className={cl("update")}>
                <div className={cl("update-head")}>
                    <img className={cl("update-logo")} src={LARPCORD_LOGO} alt="" draggable={false} />
                    <div className={cl("update-versions")}>
                        <span className={cl("update-old")}>v{status.currentVersion}</span>
                        <span aria-hidden>→</span>
                        <span className={cl("update-new")}>v{version}</span>
                    </div>
                </div>
                <h4 className={cl("update-notes-title")}>{t("core.updates.changelog")}</h4>
                <div className={cl("update-notes")}>
                    {notes ?? <p className={cl("muted")}>{t("core.updates.noChangelog")}</p>}
                </div>
                <small className={cl("muted")}>{t("core.updates.laterHint")}</small>
            </div>
        </Modal>
    );
}

let shownFor: string | undefined;

/** Zeigt den Update-Hinweis. Fällt auf Discords Hinweisleiste zurück, falls das Modal nicht verfügbar ist. */
export function openUpdateModal(status: LarpUpdaterStatus) {
    const version = status.update?.version;
    if (!version) return;
    shownFor = version;

    try {
        openModal(
            props => (
                <ErrorBoundary noop>
                    <UpdateModal modalProps={props} status={status} />
                </ErrorBoundary>
            ),
            { onCloseCallback: () => void dismissUpdate(version) }
        );
    } catch (e) {
        logger.warn("Update-Modal konnte nicht geöffnet werden, zeige Hinweisleiste", e);
        try {
            showNotice(t("core.updates.noticeText", { version }), t("core.updates.restartNow"), () => void installUpdateNow());
        } catch (err) {
            logger.error("Update-Hinweis konnte nicht angezeigt werden", err);
        }
    }
}

/** Hinweis automatisch zeigen, sobald ein Update geladen ist (einmal pro Version und Sitzung, nicht nach „Später“) */
export function watchForDownloadedUpdates() {
    return onUpdaterStatus(status => {
        const version = status?.update?.version;
        if (status?.state !== "downloaded" || !version) return;
        if (version === shownFor || version === status.dismissedVersion) return;
        openUpdateModal(status);
    });
}
