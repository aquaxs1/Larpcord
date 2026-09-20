/*
 * Vesktop, a desktop app aiming to give you a snappier Discord Experience
 * Copyright (c) 2023 Vendicated and Vencord contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Heading, Margins, Paragraph } from "@vencord/types/components";
import { Select } from "@vencord/types/webpack/common";
import { t } from "renderer/i18n";

import { SimpleErrorBoundary } from "../SimpleErrorBoundary";
import { SettingsComponent } from "./Settings";

export const WebRTCIPHandlingPolicyPicker: SettingsComponent = ({ settings }) => {
    return (
        <SimpleErrorBoundary>
            <div>
                <Heading tag="h5">{t("desktop.settings.webRTC.title")}</Heading>
                <Paragraph className={Margins.bottom8}>{t("desktop.settings.webRTC.description")}</Paragraph>
                <Select
                    placeholder={t("common.default")}
                    options={[
                        { label: t("common.default"), value: "default", default: true },
                        {
                            label: t("desktop.settings.webRTC.publicOnly"),
                            value: "default_public_interface_only"
                        },

                        {
                            label: t("desktop.settings.webRTC.publicAndPrivate"),
                            value: "default_public_and_private_interfaces"
                        },
                        { label: t("desktop.settings.webRTC.disableNonProxiedUdp"), value: "disable_non_proxied_udp" }
                    ]}
                    closeOnSelect={true}
                    select={v => (settings.webRTCIPHandlingPolicy = v)}
                    isSelected={v => v === settings.webRTCIPHandlingPolicy}
                    serialize={s => s}
                />
            </div>
        </SimpleErrorBoundary>
    );
};
