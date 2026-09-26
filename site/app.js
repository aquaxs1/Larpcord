// Larpcord – Website: Geldregen, Live-Vorschau zum Ausprobieren und Download-Link aus dem neuesten Release.
// Kein Tracking, keine Cookies. Eingaben landen nur per textContent in der Seite.

(() => {
    "use strict";

    const $ = sel => document.querySelector(sel);
    const $$ = sel => [...document.querySelectorAll(sel)];
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    /* ---------- Geldregen ---------- */
    const billSvg = `<svg viewBox="0 0 120 52" xmlns="http://www.w3.org/2000/svg">
        <rect x="1" y="1" width="118" height="50" rx="4" fill="#cfd8b8" stroke="#1d3d2a" stroke-width="2"/>
        <rect x="6" y="6" width="108" height="40" rx="2" fill="none" stroke="#2b5a3d" stroke-width="1" stroke-dasharray="3 2"/>
        <ellipse cx="60" cy="26" rx="14" ry="16" fill="#8fae7c" stroke="#1d3d2a"/>
        <text x="60" y="32" font-family="Georgia,serif" font-size="16" font-weight="700" text-anchor="middle" fill="#1d3d2a">L</text>
        <text x="14" y="20" font-family="Georgia,serif" font-size="11" font-weight="700" fill="#1d3d2a">100</text>
        <text x="106" y="44" font-family="Georgia,serif" font-size="11" font-weight="700" text-anchor="end" fill="#1d3d2a">100</text>
    </svg>`;
    if (!reducedMotion) {
        const rain = $(".money-rain");
        const count = window.innerWidth < 700 ? 7 : 14;
        for (let i = 0; i < count; i++) {
            const b = document.createElement("div");
            b.className = "bill";
            b.innerHTML = billSvg;
            b.style.left = `${Math.random() * 100}%`;
            b.style.animationDuration = `${14 + Math.random() * 16}s`;
            b.style.animationDelay = `${-Math.random() * 30}s`;
            b.style.setProperty("--drift", `${(Math.random() - .5) * 240}px`);
            b.style.setProperty("--spin", `${(Math.random() - .5) * 720}deg`);
            b.style.scale = String(.6 + Math.random() * .7);
            rain.appendChild(b);
        }
    }

    /* ---------- Tabs ---------- */
    function selectTab(name, flash = false) {
        $$(".tabs [role=tab]").forEach(t => t.setAttribute("aria-selected", String(t.dataset.tab === name)));
        $$(".tabpanel").forEach(p => {
            p.hidden = p.dataset.panel !== name;
            if (flash && !p.hidden) {
                p.classList.remove("flash");
                void p.offsetWidth;
                p.classList.add("flash");
            }
        });
    }
    $$(".tabs [role=tab]").forEach(t => t.addEventListener("click", () => selectTab(t.dataset.tab)));
    $$("[data-try]").forEach(btn => btn.addEventListener("click", () => {
        selectTab(btn.dataset.try, true);
        setView("larp");
        $("#ausprobieren").scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "start" });
    }));

    /* ---------- Vorher/Nachher ---------- */
    const discord = $("#discord");
    function setView(view) {
        discord.dataset.view = view;
        $$(".compare button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.view === view)));
        render();
    }
    $$(".compare button").forEach(b => b.addEventListener("click", () => setView(b.dataset.view)));

    /* ---------- Badges ---------- */
    // Eigene, schlichte Symbole – keine Grafiken aus Discords Client.
    const BADGES = [
        { id: "staff", label: "Discord Staff", icon: "🛠", bg: "#5865f2", on: true },
        { id: "partner", label: "Partner", icon: "∞", bg: "#4f5ee8", on: true },
        { id: "hype", label: "HypeSquad Events", icon: "🏠", bg: "#f47b67" },
        { id: "bravery", label: "HypeSquad Bravery", icon: "⚔", bg: "#9c84ef" },
        { id: "brilliance", label: "HypeSquad Brilliance", icon: "✦", bg: "#f47b67" },
        { id: "balance", label: "HypeSquad Balance", icon: "⚖", bg: "#45ddc0" },
        { id: "early", label: "Early Supporter", icon: "🪙", bg: "#b877ff", on: true },
        { id: "bug1", label: "Bug Hunter", icon: "🐞", bg: "#3ba55c" },
        { id: "bug2", label: "Bug Hunter Stufe 2", icon: "🐛", bg: "#d4af37" },
        { id: "dev", label: "Active Developer", icon: "</>", bg: "#23a55a", on: true },
        { id: "mod", label: "Moderator Alumni", icon: "🛡", bg: "#e67e22" },
        { id: "botdev", label: "Early Verified Bot Developer", icon: "⚙", bg: "#3e70dd" },
        { id: "custom", label: "Eigenes Badge: Millionär", icon: "💰", bg: "#1d3d2a", on: true },
    ];
    const badgeChecks = $("#badgeChecks");
    for (const b of BADGES) {
        const label = document.createElement("label");
        const input = document.createElement("input");
        input.type = "checkbox";
        input.checked = !!b.on;
        input.dataset.badge = b.id;
        input.addEventListener("change", render);
        label.append(input, document.createTextNode(` ${b.label}`));
        badgeChecks.appendChild(label);
    }

    /* ---------- Rollen ---------- */
    const TEMPLATES = [
        { name: "Owner", color: "#f1c40f" },
        { name: "Admin", color: "#e74c3c" },
        { name: "Moderator", color: "#3498db" },
        { name: "VIP", color: "#9b59b6" },
    ];
    let roles = [{ name: "Owner", color: "#f1c40f" }, { name: "Millionär", color: "#85bb65" }];
    const roleTemplates = $("#roleTemplates");
    for (const t of TEMPLATES) {
        const chip = document.createElement("button");
        chip.type = "button";
        chip.className = "chip";
        const dot = document.createElement("i");
        dot.style.background = t.color;
        chip.append(dot, document.createTextNode(`+ ${t.name}`));
        chip.addEventListener("click", () => addRole(t.name, t.color));
        roleTemplates.appendChild(chip);
    }
    function addRole(name, color) {
        name = name.trim();
        if (!name || roles.some(r => r.name === name) || roles.length >= 8) return;
        roles.push({ name, color });
        render();
    }
    $("#addRole").addEventListener("click", () => {
        addRole($("#roleName").value, $("#roleColor").value);
        $("#roleName").value = "";
    });
    $("#roleName").addEventListener("keydown", e => { if (e.key === "Enter") $("#addRole").click(); });

    /* ---------- Musik (kleine WebAudio-Demo) ---------- */
    let audio = null;
    function stopMusic() {
        if (!audio) return;
        clearInterval(audio.timer);
        audio.ctx.close();
        audio = null;
        $("#playBtn").textContent = "▶";
        $("#playBtn").setAttribute("aria-label", "Demo abspielen");
        $("#musicBar").style.width = "0";
    }
    function playMusic() {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        if (!Ctx) return;
        const ctx = new Ctx();
        const gain = ctx.createGain();
        gain.gain.value = $("#volume").value / 250;
        gain.connect(ctx.destination);
        const notes = [523.25, 659.25, 783.99, 1046.5, 783.99, 659.25, 587.33, 698.46, 880, 698.46, 587.33, 493.88];
        const step = .22, total = notes.length * step * 2;
        const start = ctx.currentTime + .05;
        for (let loop = 0; loop < 2; loop++) {
            notes.forEach((f, i) => {
                const t = start + (loop * notes.length + i) * step;
                const osc = ctx.createOscillator();
                const env = ctx.createGain();
                osc.type = "triangle";
                osc.frequency.value = f;
                env.gain.setValueAtTime(0, t);
                env.gain.linearRampToValueAtTime(1, t + .02);
                env.gain.exponentialRampToValueAtTime(.001, t + step * .95);
                osc.connect(env).connect(gain);
                osc.start(t);
                osc.stop(t + step);
            });
        }
        audio = { ctx, gain };
        audio.timer = setInterval(() => {
            const p = Math.min(1, (ctx.currentTime - start) / total);
            $("#musicBar").style.width = `${p * 100}%`;
            if (p >= 1) stopMusic();
        }, 100);
        $("#playBtn").textContent = "■";
        $("#playBtn").setAttribute("aria-label", "Demo stoppen");
    }
    $("#playBtn").addEventListener("click", () => (audio ? stopMusic() : playMusic()));
    $("#volume").addEventListener("input", () => { if (audio) audio.gain.gain.value = $("#volume").value / 250; });

    /* ---------- Rendern ---------- */
    const REAL = { displayName: "Max", username: "max_mustermann", memberSince: "2021-03-14", server: "Gaming Treff" };
    const dateFmt = new Intl.DateTimeFormat("de-DE", { day: "numeric", month: "short", year: "numeric" });
    const val = id => $(`#${id}`).value;
    const on = id => $(`#${id}`).checked;

    function formatDate(iso) {
        const d = new Date(`${iso}T12:00:00`);
        return Number.isNaN(d.getTime()) ? "–" : dateFmt.format(d);
    }

    function render() {
        const larp = discord.dataset.view === "larp";
        const profile = $("#profile");

        // Theme, Banner, Effekt
        if (larp) {
            profile.style.setProperty("--p1", val("theme1"));
            profile.style.setProperty("--p2", val("theme2"));
            $("#pBanner").style.setProperty("--banner", `linear-gradient(135deg, ${val("theme1")}, ${val("theme2")})`);
        } else {
            profile.style.removeProperty("--p1");
            profile.style.removeProperty("--p2");
            $("#pBanner").style.removeProperty("--banner");
        }
        renderEffect(larp ? val("effect") : "none");

        // Dekoration
        const deco = $("#pDeco");
        deco.className = `p-deco ${val("decoration")}`;
        deco.replaceChildren();
        if (val("decoration") === "cash") {
            for (let i = 0; i < 10; i++) {
                const s = document.createElement("span");
                s.textContent = i % 2 ? "💵" : "🪙";
                s.style.transform = `rotate(${i * 36}deg) translate(46px) rotate(${-i * 36}deg) translate(-50%, -50%)`;
                deco.appendChild(s);
            }
        }

        // Badges
        const badges = $("#pBadges");
        badges.replaceChildren();
        const chosen = $$("#badgeChecks input").filter(i => i.checked).map(i => BADGES.find(b => b.id === i.dataset.badge));
        if (on("nitroOn")) chosen.splice(1, 0, nitroBadge(+val("nitroSince")));
        chosen.push({ label: `Server-Booster seit ${boostLabel(+val("nitroSince"))}`, icon: "💎", bg: "#ff73fa" });
        for (const b of chosen) {
            const el = document.createElement("span");
            el.className = "badge";
            el.title = b.label;
            el.textContent = b.icon;
            el.style.background = b.bg;
            badges.appendChild(el);
        }

        // Name
        const name = $("#pName");
        name.textContent = larp ? (val("displayName").trim() || REAL.displayName) : REAL.displayName;
        name.className = `p-name ${larp ? val("nameStyle") : ""}`;
        $("#pUser").textContent = larp ? (val("username").trim() || REAL.username) : REAL.username;
        $("#pClan").textContent = val("clanTag").trim().toUpperCase();
        $("#pVerified").hidden = !on("verified");
        $("#pCrown").hidden = !on("crown");
        $("#pSince").textContent = formatDate(larp ? val("memberSince") : REAL.memberSince);

        // Aktivität
        renderActivity(larp);

        // Musik
        $("#pMusic").hidden = !on("musicOn");
        $("#pSong").textContent = `♪ ${val("songTitle").trim() || "Mein Song"}`;
        if (!on("musicOn") || !larp) stopMusic();

        // Rollen
        const roleWrap = $("#pRoles");
        roleWrap.replaceChildren();
        const shownRoles = larp ? roles : [];
        for (const r of shownRoles) {
            const pill = document.createElement("span");
            pill.className = "role-pill";
            const dot = document.createElement("i");
            dot.style.background = r.color;
            pill.append(dot, document.createTextNode(r.name));
            if (larp) {
                const x = document.createElement("button");
                x.type = "button";
                x.textContent = "×";
                x.setAttribute("aria-label", `Rolle ${r.name} entfernen`);
                x.style.cssText = "background:none;border:0;color:#949ba4;cursor:pointer;padding:0 0 0 2px;font:inherit";
                x.addEventListener("click", () => { roles = roles.filter(o => o !== r); render(); });
                pill.appendChild(x);
            }
            roleWrap.appendChild(pill);
        }
        $("#pRolesLabel").hidden = shownRoles.length === 0;
        if (larp && roles.length) name.style.color = name.className.trim() === "p-name plain" ? roles[0].color : "";
        else name.style.color = "";

        const roleList = $("#roleList");
        roleList.replaceChildren();
        for (const r of roles) {
            const chip = document.createElement("span");
            chip.className = "chip";
            const dot = document.createElement("i");
            dot.style.background = r.color;
            chip.append(dot, document.createTextNode(r.name));
            roleList.appendChild(chip);
        }

        // Server
        const sName = larp ? (val("serverName").trim() || REAL.server) : REAL.server;
        $("#guildName").textContent = sName;
        $("#guildIcon").textContent = sName.split(/\s+/).map(w => w[0] || "").join("").slice(0, 3).toUpperCase();
        $("#guildIcon").title = sName;
        const sb = $("#guildBadge");
        sb.className = `d-sbadge ${val("serverBadge")}`;
        sb.textContent = val("serverBadge") === "none" ? "" : "✓";
        sb.title = { partner: "Partner-Server", verified: "Verifizierter Server" }[val("serverBadge")] || "";
        const lvl = +val("boostLevel");
        $("#guildBoost").textContent = lvl > 0 ? `💎 Level ${lvl} · ${Math.max(0, +val("boostCount") || 0)} Boosts` : "";
    }

    function nitroBadge(months) {
        const tiers = [[72, "Opal"], [60, "Rubin"], [36, "Smaragd"], [24, "Diamant"], [12, "Platin"], [6, "Gold"], [3, "Silber"], [1, "Bronze"]];
        const tier = tiers.find(([m]) => months >= m)[1];
        return { label: `Nitro-Abonnent seit ${sinceLabel(months)} (${tier})`, icon: "N", bg: "linear-gradient(135deg,#ff73fa,#7b61ff)" };
    }
    function sinceLabel(months) {
        const d = new Date();
        d.setMonth(d.getMonth() - months);
        return dateFmt.format(d);
    }
    function boostLabel(months) { return sinceLabel(Math.min(months, 24)); }

    function renderEffect(kind) {
        const fx = $("#pEffect");
        if (fx.dataset.kind === kind) return;
        fx.dataset.kind = kind;
        fx.replaceChildren();
        if (kind === "rain") {
            for (let i = 0; i < 9; i++) {
                const s = document.createElement("span");
                s.className = "fx";
                s.textContent = i % 3 ? "💵" : "💰";
                s.style.left = `${5 + i * 11}%`;
                s.style.animationDelay = `${-Math.random() * 3.2}s`;
                s.style.animationDuration = `${2.6 + Math.random() * 1.6}s`;
                fx.appendChild(s);
            }
        } else if (kind === "sparkle") {
            for (let i = 0; i < 12; i++) {
                const s = document.createElement("span");
                s.className = "spark";
                s.style.left = `${Math.random() * 95}%`;
                s.style.top = `${Math.random() * 90}%`;
                s.style.animationDelay = `${-Math.random() * 1.8}s`;
                fx.appendChild(s);
            }
        }
    }

    const ACT_ICONS = { Spielt: "🎲", Hört: "🎧", Schaut: "📺", Streamt: "📡", custom: "💬" };
    function renderActivity(larp) {
        const box = $("#pActivity");
        // „Was andere sehen“: deine echte Aktivität
        const type = larp ? val("actType") : "Spielt";
        box.hidden = type === "none";
        box.classList.toggle("listening", type === "Hört");
        box.classList.toggle("custom", type === "custom");
        $("#pActLabel").textContent = type === "custom" ? "Status" : type === "Streamt" ? "Streamt" : type;
        $("#pActImg").textContent = ACT_ICONS[type] || "🎲";
        if (larp) {
            $("#pActName").textContent = val("actName").trim() || "Irgendwas";
            $("#pActDetails").textContent = type === "custom" ? "" : val("actDetails").trim();
            $("#pActState").textContent = type === "custom" ? "" : val("actState").trim();
        } else {
            $("#pActName").textContent = "Minecraft";
            $("#pActDetails").textContent = "Baut ein Holzhaus";
            $("#pActState").textContent = "";
        }
    }

    $$(".controls input, .controls select").forEach(el => el.addEventListener("input", render));
    render();

    /* ---------- Download-Link aus dem neuesten Release ---------- */
    // Nimmt die .zip des neuesten Releases. Gibt es (noch) keine, bleibt der Link auf der Release-Seite.
    const REPO = "aquaxs1/Larpcord";
    fetch(`https://api.github.com/repos/${REPO}/releases/latest`, { headers: { Accept: "application/vnd.github+json" } })
        .then(r => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
        .then(rel => {
            const version = String(rel.tag_name || "").replace(/^v/, "");
            if (version) {
                $$("[data-version]").forEach(el => { el.textContent = `v${version}`; });
                $$("[data-version-text]").forEach(el => { el.textContent = version; });
            }
            const zip = (rel.assets || []).find(a => /\.zip$/i.test(a.name));
            const date = rel.published_at ? dateFmt.format(new Date(rel.published_at)) : "";
            const info = $("#releaseInfo");
            if (zip && /^https:\/\/github\.com\//.test(zip.browser_download_url)) {
                $("#downloadBtn").href = zip.browser_download_url;
                const mb = (zip.size / 1048576).toFixed(0);
                info.textContent = `Version ${version}${date ? ` vom ${date}` : ""} · ${zip.name} · ${mb} MB`;
            } else {
                info.textContent = `Version ${version}${date ? ` vom ${date}` : ""} · auf GitHub`;
            }
        })
        .catch(() => { /* Offline oder Rate-Limit: Link auf die Release-Seite bleibt bestehen */ });
})();
