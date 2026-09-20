/*
 * Vesktop, a desktop app aiming to give you a snappier Discord Experience
 * Copyright (c) 2025 Vendicated and Vesktop contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

declare module "__patches__" {
    const never: never;
    export default never;
}

// Larpcord: alle Sprachdateien aus core/src/plugins/larpCore/i18n/locales (scripts/i18n/locales-plugin.mjs)
declare module "~larpcord-locales" {
    const locales: Record<string, Record<string, string>>;
    export default locales;
}
