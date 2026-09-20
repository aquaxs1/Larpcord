/*
 * Vesktop, a desktop app aiming to give you a snappier Discord Experience
 * Copyright (c) 2025 Vendicated and Vencord contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./UserAssets.css";

import { BaseText, Button, FormSwitch } from "@vencord/types/components";
import { Margins } from "@vencord/types/utils";
import { Modal, openModal, showToast, useState } from "@vencord/types/webpack/common";
import { UserAssetType } from "main/userAssets";
import { t, useLarpLocale } from "renderer/i18n";
import { useSettings } from "renderer/settings";

import { SettingsComponent } from "./Settings";

const CUSTOMIZABLE_ASSETS: UserAssetType[] = ["splash", "tray", "trayUnread", "appIcon"];

export const UserAssetsButton: SettingsComponent = () => {
    return <Button onClick={() => openAssetsModal()}>{t("desktop.userAssets.button")}</Button>;
};

function openAssetsModal() {
    openModal(props => <UserAssetsModal {...props} />);
}

function UserAssetsModal(props: any) {
    // Eigenes Fenster, rendert bei Sprachwechsel nicht automatisch neu
    useLarpLocale();

    return (
        <Modal {...props} size="lg" title={t("desktop.userAssets.modalTitle")}>
            <div className="vcd-user-assets">
                {CUSTOMIZABLE_ASSETS.map(asset => (
                    <Asset key={asset} asset={asset} />
                ))}
            </div>
        </Modal>
    );
}

function Asset({ asset }: { asset: UserAssetType }) {
    // cache busting
    const [version, setVersion] = useState(Date.now());
    const settings = useSettings();

    const isSplash = asset === "splash";
    const imageRendering = isSplash && settings.splashPixelated ? "pixelated" : "auto";

    const onChooseAsset = (value?: null) => async () => {
        const res = await VesktopNative.fileManager.chooseUserAsset(asset, value);
        if (res === "ok") {
            setVersion(Date.now());
            if (isSplash && value === null) {
                settings.splashPixelated = false;
            }
        } else if (res === "failed") {
            showToast(t("desktop.userAssets.failed"));
        }
    };

    return (
        <section>
            <BaseText size="md" weight="medium" tag="h3">
                {/* i18n-keys: desktop.userAssets.asset.* */}
                {t(`desktop.userAssets.asset.${asset}`)}
            </BaseText>
            <div className="vcd-user-assets-asset">
                <img
                    className="vcd-user-assets-image"
                    src={`vesktop://assets/${asset}?v=${version}`}
                    alt=""
                    style={{ imageRendering }}
                />
                <div className="vcd-user-assets-actions">
                    <div className="vcd-user-assets-buttons">
                        <Button onClick={onChooseAsset()}>{t("desktop.userAssets.customize")}</Button>
                        <Button variant="secondary" onClick={onChooseAsset(null)}>
                            {t("desktop.userAssets.resetToDefault")}
                        </Button>
                    </div>
                    {isSplash && (
                        <FormSwitch
                            title={t("desktop.userAssets.pixelated")}
                            value={settings.splashPixelated}
                            onChange={val => (settings.splashPixelated = val)}
                            className={Margins.top16}
                            hideBorder
                        />
                    )}
                    {isSplash && (
                        <input
                            className={`vcd-user-assets-text ${Margins.top16}`}
                            placeholder={t("desktop.userAssets.splashText", { text: t("desktop.splash.loading") })}
                            maxLength={100}
                            value={settings.splashText ?? ""}
                            onChange={e => (settings.splashText = e.currentTarget.value || undefined)}
                        />
                    )}
                    {asset === "appIcon" && (
                        <BaseText size="sm" className={Margins.top8}>
                            {t("desktop.userAssets.appIconHint")}
                        </BaseText>
                    )}
                </div>
            </div>
        </section>
    );
}
