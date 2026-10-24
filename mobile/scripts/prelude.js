/*
 * Larpcord mobile – runs before the Vencord userscript inside the Android/iOS web view.
 * SPDX-License-Identifier: GPL-3.0-or-later
 */
(function () {
    "use strict";

    // Only the Discord app itself, once per page (not the offline page, not iframes such as hCaptcha)
    const isDiscord = /(^|\.)discord\.com$/.test(location.hostname) && window.top === window;
    if (!isDiscord || window.__larpcordMobile) return;

    // Tampermonkey's GM_xmlhttpRequest, reduced to what Vencord uses. Unlike a userscript manager it is
    // bound by CORS, so requests to hosts without CORS headers fail and Vencord falls back as it does on the web.
    function xhr(details) {
        const req = new XMLHttpRequest();
        req.open(details.method || "GET", details.url, true);
        for (const [key, value] of Object.entries(details.headers || {})) req.setRequestHeader(key, value);
        if (details.responseType) req.responseType = details.responseType;
        if (details.timeout) req.timeout = details.timeout;

        const response = () => ({
            status: req.status,
            statusText: req.statusText,
            readyState: req.readyState,
            responseHeaders: req.getAllResponseHeaders(),
            response: req.response,
            responseText: req.responseType === "" || req.responseType === "text" ? req.responseText : undefined,
            finalUrl: req.responseURL
        });
        req.onload = () => details.onload?.(response());
        req.onerror = () => details.onerror?.(response());
        req.ontimeout = () => details.ontimeout?.(response());
        req.onabort = () => details.onabort?.(response());
        req.send(details.data ?? null);
        return { abort: () => req.abort() };
    }

    // Discord's web layout is made for desktops. On narrow screens, render it at tablet width and let the
    // system scale it down, so the whole client fits and can still be zoomed with two fingers.
    const MIN_WIDTH = 1000;
    function fitViewport() {
        if (Math.min(screen.width, screen.height) >= MIN_WIDTH) return;
        let meta = document.querySelector('meta[name="viewport"]');
        if (!meta) {
            meta = document.createElement("meta");
            meta.name = "viewport";
            (document.head || document.documentElement).appendChild(meta);
        }
        const content = `width=${MIN_WIDTH}, viewport-fit=cover`;
        if (meta.content !== content) meta.content = content;
    }
    document.addEventListener("DOMContentLoaded", () => {
        fitViewport();
        // Discord rewrites the head while it loads; keep our viewport
        new MutationObserver(fitViewport).observe(document.head, { childList: true, subtree: true, attributes: true });
    });

    window.__larpcordMobile = { run: true, xhr };
})();
