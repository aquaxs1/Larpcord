/*
 * Vesktop, a desktop app aiming to give you a snappier Discord Experience
 * Copyright (c) 2026 Vendicated and Vesktop contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { showToast, Toasts } from "@vencord/types/webpack/common";
import { t } from "renderer/i18n";
import { onIpcCommand } from "renderer/ipcCommands";
import { VesktopLogger } from "renderer/logger";
import { IpcCommands } from "shared/IpcEvents";

/*
 * Screen sharing diagnostics: when Go Live fails, show *why* instead of silently doing nothing.
 * - Renderer: every getDisplayMedia call is logged; a rejection (other than the user cancelling) shows a toast.
 * - Main: errors from desktopCapturer / the picker arrive via the SCREEN_SHARE_ERROR command.
 * No log line at all after clicking "Share your screen" means Discord never asked for a stream.
 */

function showScreenShareError(reason: unknown) {
    const message = reason instanceof Error ? `${reason.name}: ${reason.message}` : String(reason);
    VesktopLogger.error("Screen share failed:", reason);
    try {
        showToast(t("desktop.screenShare.failed", { error: message.slice(0, 200) }), Toasts.Type.FAILURE);
    } catch {
        // Toasts not ready yet – the log line above is still there
    }
}

const original = navigator.mediaDevices?.getDisplayMedia;
if (typeof original === "function") {
    navigator.mediaDevices.getDisplayMedia = async function (...args: Parameters<typeof original>) {
        VesktopLogger.log("Screen share requested", args[0]);
        try {
            const stream = await original.apply(this, args);
            VesktopLogger.log(
                "Screen share started",
                stream.getTracks().map(track => `${track.kind}:${track.label}`)
            );
            return stream;
        } catch (e) {
            // Closing the picker rejects with NotAllowedError / "Aborted" – that is not an error worth a toast
            const cancelled = (e instanceof DOMException && e.name === "NotAllowedError") || e === "Aborted";
            if (cancelled) VesktopLogger.log("Screen share cancelled");
            else showScreenShareError(e);
            throw e;
        }
    };
}

onIpcCommand(IpcCommands.SCREEN_SHARE_ERROR, (message: string) => showScreenShareError(message));
