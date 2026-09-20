/*
 * Larpcord, a standalone Discord client for local cosmetic larping
 * Copyright (c) 2026 Larpcord contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// Offizielles Larpcord-Logo (erzeugt von scripts/generate-icons.py aus assets/larpcordlogo.png), beim Build eingebettet
import logoBase64 from "file://assets/logo.png?base64";

export const LARPCORD_LOGO = `data:image/png;base64,${logoBase64}`;
