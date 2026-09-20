/*
 * Vesktop, a desktop app aiming to give you a snappier Discord Experience
 * Copyright (c) 2023 Vendicated and Vencord contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Heading, Paragraph } from "@vencord/types/components";
import { Margins } from "@vencord/types/utils";
import { Select } from "@vencord/types/webpack/common";
import { t } from "renderer/i18n";

import { SimpleErrorBoundary } from "../SimpleErrorBoundary";
import { SettingsComponent } from "./Settings";

export const WindowsTransparencyControls: SettingsComponent = ({ settings }) => {
    if (!VesktopNative.app.supportsWindowsTransparency()) return null;

    return (
        <div>
            <Heading tag="h5">{t("desktop.settings.transparency.title")}</Heading>
            <Paragraph className={Margins.bottom8}>{t("desktop.settings.transparency.description")}</Paragraph>

            <SimpleErrorBoundary>
                <Select
                    placeholder={t("common.none")}
                    options={[
                        {
                            label: t("common.none"),
                            value: "none",
                            default: true
                        },
                        {
                            label: t("desktop.settings.transparency.mica"),
                            value: "mica"
                        },
                        { label: t("desktop.settings.transparency.tabbed"), value: "tabbed" },
                        {
                            label: t("desktop.settings.transparency.acrylic"),
                            value: "acrylic"
                        }
                    ]}
                    closeOnSelect={true}
                    select={v => (settings.transparencyOption = v)}
                    isSelected={v => v === settings.transparencyOption}
                    serialize={s => s}
                />
            </SimpleErrorBoundary>
        </div>
    );
};
