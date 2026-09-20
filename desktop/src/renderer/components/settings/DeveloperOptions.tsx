/*
 * Vesktop, a desktop app aiming to give you a snappier Discord Experience
 * Copyright (c) 2025 Vendicated and Vencord contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Button, Heading, Paragraph, TextButton } from "@vencord/types/components";
import { Margins, useForceUpdater } from "@vencord/types/utils";
import { Modal, openModal, Toasts } from "@vencord/types/webpack/common";
import { t, tNode, useLarpLocale } from "renderer/i18n";
import { Settings } from "shared/settings";

import { cl, SettingsComponent } from "./Settings";

export const DeveloperOptionsButton: SettingsComponent = ({ settings }) => {
    return <Button onClick={() => openDeveloperOptionsModal(settings)}>{t("desktop.devOptions.button")}</Button>;
};

function openDeveloperOptionsModal(settings: Settings) {
    openModal(props => <DeveloperOptionsModal {...props} settings={settings} />);
}

/** Die Props, die openModal an die gerenderte Komponente gibt (RenderModalProps) */
interface ModalRenderProps {
    transitionState: number;
    onClose(): void;
}

function DeveloperOptionsModal({ settings, ...props }: { settings: Settings } & ModalRenderProps) {
    // Eigenes Fenster, rendert bei Sprachwechsel nicht automatisch neu
    useLarpLocale();

    return (
        <Modal {...props} size="lg" title={t("desktop.devOptions.modalTitle")}>
            <Heading tag="h4">{t("desktop.devOptions.coreLocation")}</Heading>
            <VencordLocationPicker settings={settings} />

            <Heading tag="h4" className={Margins.top16}>
                {t("desktop.devOptions.debugging")}
            </Heading>
            <div className={cl("button-grid")}>
                <Button onClick={() => VesktopNative.debug.launchGpu()}>{t("desktop.devOptions.openGpu")}</Button>
                <Button onClick={() => VesktopNative.debug.launchWebrtcInternals()}>
                    {t("desktop.devOptions.openWebrtcInternals")}
                </Button>
            </div>
        </Modal>
    );
}

const VencordLocationPicker: SettingsComponent = ({ settings }) => {
    const forceUpdate = useForceUpdater();
    const usingCustomVencordDir = VesktopNative.fileManager.isUsingCustomVencordDir();

    return (
        <>
            <Paragraph>
                {tNode("desktop.devOptions.filesLoadedFrom", {
                    location: usingCustomVencordDir ? (
                        <TextButton
                            variant="link"
                            onClick={e => {
                                e.preventDefault();
                                VesktopNative.fileManager.showCustomVencordDir();
                            }}
                        >
                            {t("desktop.devOptions.customLocation")}
                        </TextButton>
                    ) : (
                        t("desktop.devOptions.defaultLocation")
                    )
                })}
            </Paragraph>
            <div className={cl("button-grid")}>
                <Button
                    onClick={async () => {
                        const choice = await VesktopNative.fileManager.selectVencordDir();
                        switch (choice) {
                            case "cancelled":
                                break;
                            case "ok":
                                Toasts.show({
                                    message: t("desktop.devOptions.changed"),
                                    id: Toasts.genId(),
                                    type: Toasts.Type.SUCCESS
                                });
                                break;
                            case "invalid":
                                Toasts.show({
                                    message: t("desktop.devOptions.invalid"),
                                    id: Toasts.genId(),
                                    type: Toasts.Type.FAILURE
                                });
                                break;
                        }
                        forceUpdate();
                    }}
                >
                    {t("desktop.devOptions.change")}
                </Button>
                <Button
                    variant="dangerPrimary"
                    onClick={async () => {
                        await VesktopNative.fileManager.selectVencordDir(null);
                        forceUpdate();
                    }}
                >
                    {t("common.reset")}
                </Button>
            </div>
        </>
    );
};
