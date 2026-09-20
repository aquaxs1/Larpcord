/*
 * Vesktop, a desktop app aiming to give you a snappier Discord Experience
 * Copyright (c) 2023 Vendicated and Vencord contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./settings.css";

import { classNameFactory } from "@vencord/types/api/Styles";
import { BaseText, Divider, ErrorBoundary } from "@vencord/types/components";
import { ComponentType } from "react";
import { WebRTCIPHandlingPolicyPicker } from "renderer/components/settings/WebRTCIPHandlingPolicyPicker";
import { t, useLarpLocale } from "renderer/i18n";
import { getValueAndOnChange, Settings, useSettings } from "renderer/settings";
import { isMac } from "renderer/utils";

import { AutoStartToggle } from "./AutoStartToggle";
import { DeveloperOptionsButton } from "./DeveloperOptions";
import { DiscordBranchPicker } from "./DiscordBranchPicker";
import { NotificationBadgeToggle } from "./NotificationBadgeToggle";
import { UserAssetsButton } from "./UserAssets";
import { VesktopSettingsSwitch } from "./VesktopSettingsSwitch";
import { WindowsTransparencyControls } from "./WindowsTransparencyControls";

interface BooleanSetting {
    key: keyof typeof Settings.store;
    /** Übersetzungsschlüssel, Text wird erst beim Rendern berechnet (Sprachwechsel) */
    titleKey: string;
    descriptionKey: string;
    disabled?(): boolean;
    invisible?(): boolean;
}

export const cl = classNameFactory("vcd-settings-");

export type SettingsComponent = ComponentType<{ settings: typeof Settings.store }>;

interface SettingsCategory {
    /** Stabile ID (React-Key), unabhängig von der Sprache */
    id: string;
    titleKey: string;
    settings: Array<BooleanSetting | SettingsComponent>;
}

const SettingsOptions: SettingsCategory[] = [
    { id: "discordBranch", titleKey: "desktop.settings.category.discordBranch", settings: [DiscordBranchPicker] },
    {
        id: "startup",
        titleKey: "desktop.settings.category.startup",
        settings: [
            AutoStartToggle,
            {
                key: "hardwareAcceleration",
                titleKey: "desktop.settings.hardwareAcceleration.title",
                descriptionKey: "desktop.settings.hardwareAcceleration.description"
            },
            {
                key: "hardwareVideoAcceleration",
                titleKey: "desktop.settings.hardwareVideoAcceleration.title",
                descriptionKey: "desktop.settings.hardwareVideoAcceleration.description",
                disabled: () => !Settings.store.hardwareAcceleration
            }
        ]
    },
    {
        id: "ui",
        titleKey: "desktop.settings.category.ui",
        settings: [
            {
                key: "nativeTitleBar",
                titleKey: "desktop.settings.nativeTitleBar.title",
                descriptionKey: "desktop.settings.nativeTitleBar.description"
            },
            {
                key: "staticTitle",
                titleKey: "desktop.settings.staticTitle.title",
                descriptionKey: "desktop.settings.staticTitle.description"
            },
            {
                key: "enableMenu",
                titleKey: "desktop.settings.enableMenu.title",
                descriptionKey: "desktop.settings.enableMenu.description",
                disabled: () => !Settings.store.nativeTitleBar
            },
            {
                key: "enableShadow",
                titleKey: "desktop.settings.enableShadow.title",
                descriptionKey: "desktop.settings.enableShadow.description",
                disabled: () => Settings.store.nativeTitleBar
            },
            {
                key: "enableRoundedCorners",
                titleKey: "desktop.settings.enableRoundedCorners.title",
                descriptionKey: "desktop.settings.enableRoundedCorners.description",
                disabled: () => Settings.store.nativeTitleBar
            },
            {
                key: "enableSplashScreen",
                titleKey: "desktop.settings.enableSplashScreen.title",
                descriptionKey: "desktop.settings.enableSplashScreen.description"
            },
            {
                key: "splashTheming",
                titleKey: "desktop.settings.splashTheming.title",
                descriptionKey: "desktop.settings.splashTheming.description"
            },
            WindowsTransparencyControls,
            UserAssetsButton
        ]
    },
    {
        id: "behaviour",
        titleKey: "desktop.settings.category.behaviour",
        settings: [
            {
                key: "tray",
                titleKey: "desktop.settings.tray.title",
                descriptionKey: "desktop.settings.tray.description",
                invisible: () => isMac
            },
            {
                key: "minimizeToTray",
                titleKey: "desktop.settings.minimizeToTray.title",
                descriptionKey: "desktop.settings.minimizeToTray.description",
                invisible: () => isMac,
                disabled: () => !Settings.store.tray
            },
            {
                key: "clickTrayToShowHide",
                titleKey: "desktop.settings.clickTrayToShowHide.title",
                descriptionKey: "desktop.settings.clickTrayToShowHide.description"
            },
            {
                key: "disableMinSize",
                titleKey: "desktop.settings.disableMinSize.title",
                descriptionKey: "desktop.settings.disableMinSize.description"
            },
            {
                key: "disableSmoothScroll",
                titleKey: "desktop.settings.disableSmoothScroll.title",
                descriptionKey: "desktop.settings.disableSmoothScroll.description"
            }
        ]
    },
    {
        id: "notifications",
        titleKey: "desktop.settings.category.notifications",
        settings: [
            NotificationBadgeToggle,
            {
                key: "enableTaskbarFlashing",
                titleKey: "desktop.settings.enableTaskbarFlashing.title",
                descriptionKey: "desktop.settings.enableTaskbarFlashing.description"
            }
        ]
    },
    {
        id: "misc",
        titleKey: "desktop.settings.category.misc",
        settings: [
            {
                key: "arRPC",
                titleKey: "desktop.settings.arRPC.title",
                descriptionKey: "desktop.settings.arRPC.description"
            },

            {
                key: "openLinksWithElectron",
                titleKey: "desktop.settings.openLinksWithElectron.title",
                descriptionKey: "desktop.settings.openLinksWithElectron.description"
            },

            WebRTCIPHandlingPolicyPicker
        ]
    },

    { id: "developer", titleKey: "desktop.settings.category.developer", settings: [DeveloperOptionsButton] }
];

function SettingsSections() {
    const Settings = useSettings();

    const sections = SettingsOptions.map(({ id, titleKey, settings }, i, arr) => (
        <div key={id} className={cl("category")}>
            <BaseText size="lg" weight="semibold" tag="h3" className={cl("category-title")}>
                {t(titleKey)}
            </BaseText>

            <div className={cl("category-content")}>
                {settings.map((Setting, i) => {
                    if (typeof Setting === "function") return <Setting key={`Custom-${i}`} settings={Settings} />;

                    const { titleKey, descriptionKey, key, disabled, invisible } = Setting;
                    if (invisible?.()) return null;

                    return (
                        <VesktopSettingsSwitch
                            title={t(titleKey)}
                            description={t(descriptionKey)}
                            disabled={disabled?.()}
                            {...getValueAndOnChange(key)}
                            key={key}
                        />
                    );
                })}
            </div>

            {i < arr.length - 1 && <Divider className={cl("category-divider")} />}
        </div>
    ));

    return <>{sections}</>;
}

export default ErrorBoundary.wrap(
    function SettingsUI() {
        // Ganzer Tab rendert bei Sprachwechsel neu (Unterkomponenten inklusive)
        useLarpLocale();

        return (
            <section>
                <SettingsSections />
            </section>
        );
    },
    {
        // Getter: wird erst beim Rendern gelesen (aktuelle Sprache)
        get message() {
            return t("desktop.settings.renderError");
        }
    }
);
