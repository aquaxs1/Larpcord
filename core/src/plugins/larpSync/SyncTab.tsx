/*
 * Larpcord, a standalone Discord client for local cosmetic larping
 * Copyright (c) 2026 Larpcord contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Btn, cl, Row, Section, TextField, Toggle } from "@plugins/larpCore/hub/components";
import { t, useLarpLocale } from "@plugins/larpCore/i18n";
import { getSelfId, LarpStore } from "@plugins/larpCore/store";
import { showToast, Toasts, UserStore, useState } from "@webpack/common";

import { cancelLogin, deleteShared, isSyncAvailable, login, logout, setServerUrl, setShare, setView, UploadState, useSyncState } from "./sync";

// i18n-keys: sync.upload.* (upload state line)
const UPLOAD_KEYS: Record<UploadState, string> = {
    idle: "sync.upload.idle",
    uploading: "sync.upload.uploading",
    shared: "sync.upload.shared",
    removed: "sync.upload.removed",
    error: "sync.upload.error",
    otherAccount: "sync.upload.otherAccount"
};

function userLabel(id: string) {
    try {
        const user = UserStore.getUser(id);
        if (user) return user.globalName ? `${user.globalName} (@${user.username})` : `@${user.username}`;
    } catch { }
    return id;
}

export function SyncTab() {
    useLarpLocale();
    const { settings, status, uploadState, lastError, sharedCount } = useSyncState();
    const [busy, setBusy] = useState(false);

    if (!isSyncAvailable()) {
        return (
            <Section title={t("sync.title")}>
                <p className={cl("muted")}>{t("sync.notAvailable")}</p>
            </Section>
        );
    }
    if (!status) return <Section title={t("sync.title")}><p className={cl("muted")}>…</p></Section>;

    // i18n-keys: sync.loginError.* (login result)
    const doLogin = async () => {
        setBusy(true);
        try {
            const res = await login();
            if (res.ok) showToast(t("sync.loginDone"), Toasts.Type.SUCCESS);
            else if (res.error !== "cancelled") showToast(t(`sync.loginError.${res.error}`), Toasts.Type.FAILURE);
        } finally {
            setBusy(false);
        }
    };

    const loggedIn = !!status.userId;
    const otherAccount = loggedIn && getSelfId() !== status.userId;

    return (
        <>
            <Section title={t("sync.title")} description={t("sync.description")}>
                <Row label={t("sync.server")} hint={t("sync.serverHint")}>
                    <TextField
                        value={status.url}
                        placeholder="https://…"
                        validate={v => /^https:\/\/\S+$|^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/\S*)?$/.test(v) ? undefined : t("sync.errorUrl")}
                        onCommit={async v => {
                            const err = await setServerUrl(v ?? status.defaultUrl);
                            if (err) showToast(t("sync.errorUrl"), Toasts.Type.FAILURE);
                        }}
                    />
                </Row>
                {!status.url && <p className={cl("muted")}>{t("sync.noServer")}</p>}

                <Row label={t("sync.account")} hint={loggedIn ? undefined : t("sync.loginHint")}>
                    {status.loggingIn || busy ? (
                        <>
                            <span className={cl("muted")}>{t("sync.waitingForBrowser")}</span>
                            <Btn variant="secondary" onClick={() => void cancelLogin()}>{t("common.cancel")}</Btn>
                        </>
                    ) : loggedIn ? (
                        <>
                            <span>{t("sync.loggedInAs", { user: userLabel(status.userId!) })}</span>
                            <Btn variant="secondary" onClick={() => void logout()}>{t("sync.logout")}</Btn>
                        </>
                    ) : (
                        <Btn disabled={!status.url} onClick={() => void doLogin()}>{t("sync.login")}</Btn>
                    )}
                </Row>
                {otherAccount && <p className={cl("error")}>{t("sync.upload.otherAccount")}</p>}
            </Section>

            <Section title={t("sync.shareTitle")}>
                <Toggle
                    label={t("sync.share")}
                    hint={t("sync.shareHint")}
                    value={settings.share}
                    onChange={v => void setShare(v)}
                />
                {loggedIn && settings.share && (
                    <p className={cl("muted")}>
                        {LarpStore.isRealProfile ? t("sync.realProfileHint") : t(UPLOAD_KEYS[uploadState], { error: lastError ?? "?" })}
                    </p>
                )}
                {loggedIn && (
                    <Btn variant="danger" onClick={() => void deleteShared()}>{t("sync.deleteShared")}</Btn>
                )}
            </Section>

            <Section title={t("sync.viewTitle")}>
                <Toggle
                    label={t("sync.view")}
                    hint={t("sync.viewHint")}
                    value={settings.view}
                    onChange={v => void setView(v)}
                />
                {settings.view && status.url && (
                    <p className={cl("muted")}>{t("sync.count", { count: sharedCount })}</p>
                )}
            </Section>
        </>
    );
}
