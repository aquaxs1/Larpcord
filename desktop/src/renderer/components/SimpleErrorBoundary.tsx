/*
 * Vesktop, a desktop app aiming to give you a snappier Discord Experience
 * Copyright (c) 2025 Vendicated and Vesktop contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Card, ErrorBoundary, HeadingTertiary, Paragraph, TextButton } from "@vencord/types/components";
import { FluxDispatcher, InviteActions } from "@vencord/types/webpack/common";
import type { PropsWithChildren } from "react";
import { t, tNode } from "renderer/i18n";

async function openSupportChannel() {
    const code = "YVbdG2ZRG4";

    try {
        const { invite } = await InviteActions.resolveInvite(code, "Desktop Modal");

        if (!invite) throw 0;

        await FluxDispatcher.dispatch({
            type: "INVITE_MODAL_OPEN",
            invite,
            code,
            context: "APP"
        });
    } catch {
        window.open(`https://discord.gg/${code}`, "_blank");
    }
}

function Fallback() {
    return (
        <Card variant="danger">
            <HeadingTertiary>{t("desktop.errorBoundary.title")}</HeadingTertiary>
            <Paragraph>
                {tNode("desktop.errorBoundary.description", {
                    link: (
                        <TextButton variant="link" onClick={openSupportChannel}>
                            {t("desktop.errorBoundary.supportChannel")}
                        </TextButton>
                    )
                })}
            </Paragraph>
        </Card>
    );
}

export function SimpleErrorBoundary({ children }: PropsWithChildren<{}>) {
    return <ErrorBoundary fallback={Fallback}>{children}</ErrorBoundary>;
}
