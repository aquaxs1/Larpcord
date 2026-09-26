# Larpcord – Blueprint for Claude Code

You are building **Larpcord** with me: a standalone, open-source Discord client (its own .exe) that lets users give themselves badges, the Nitro look, decorations, server badges, different names and their own layout – locally. Everything is **visible only on their own PC**. Read `README.md` first for the feature overview.

## Language

**English is the main language of the project.** Everything visible on GitHub is written in English: README,
CHANGELOG (= release notes and the in-app update changelog), TODO, docs, commit messages, pull requests, issues,
workflow step names and script output. The website in `site/` is English only. Other languages exist **only as a
selectable language inside the client** (`core/src/plugins/larpCore/i18n/locales/`, reference is `en.json`).
New code comments are written in English.

## Basic approach

Don't start from scratch. Base:
- `desktop/` = fork of Vesktop (produces the .exe via electron-builder)
- `core/` = fork of Vencord (plugin system), our plugins in `core/src/plugins/larp*/`

Both checked in as plain folders (no submodule, `.git` removed), upstream commit hashes recorded in `UPSTREAM.md`. License stays GPL-3.0, keep the copyright notices.

---

## Hard rules (never break)

1. **Local only:** no write requests to the Discord API (no PATCH/POST on `/users/@me`, `/guilds/...` etc.).
2. **Own user only:** profile and name overrides only for your own user ID (`UserStore.getCurrentUser().id`).
3. **Server badges are display only:** never change guild features globally.
4. **No selfbot behavior:** no automated messages, reactions, joins.
5. **Never change Discord's own server order** (account settings, synced).
6. **Every patch needs a fallback:** if a `find` no longer matches, nothing may crash; the feature is disabled and logged.
7. **Never fake server-checked Nitro features** (upload limits, stream quality), never enable UI that then fails server-side.
8. **If something would only work with write API requests:** leave it out and note it in `TODO.md`.
9. **No presence updates:** larp activities only come into existence when *reading* the display stores. What Discord
   sends to the gateway (`SelfPresenceStore.getLocalPresence()`) stays untouched.
10. **No larp roles in permissions:** roles never show up in `member.roles` or in `GuildRoleStore`,
    only in the final display list – and without `permissions`.
11. **No larp value in a form that gets submitted:** where Discord prefills a form with store data
    (account, server settings), a guard puts the real values back before the request.

---

## Repo structure

```
larpcord/
├── README.md
├── CLAUDE.md                 ← this file
├── TODO.md                   ← deliberately omitted items, open ideas
├── UPSTREAM.md               ← upstream commit hashes
├── CHANGELOG.md              ← release notes (English)
├── package.json              ← root scripts: build, dev, package
├── ship.bat                  ← one-click installer build on Windows
├── scripts/                  ← build.mjs, install.mjs, set-version.mjs, generate-icons.py
├── site/                     ← project website (static, Vercel root "site", English only)
├── core/                     ← fork of Vencord
│   └── src/plugins/
│       ├── larpCore/         ← store, hub, presets, import/export, watermark
│       ├── larpBadges/
│       ├── larpNitro/
│       ├── larpDecorations/
│       ├── larpName/
│       ├── larpActivity/
│       ├── larpServers/
│       ├── larpMusic/
│       ├── larpThemes/
│       └── larpLayout/
└── desktop/                  ← fork of Vesktop
```

Do **not** rename internal Vencord identifiers (`Vencord.*`), that breaks upstream merges. Only visible names are called “Larpcord”.

---

## Plugins

- **larpCore:** central store (Vencord DataStore) with `get`/`update`/`subscribe`. Contains badges, custom badges (image + tooltip), “member since”, clan tag, Nitro (since/boosting since), profile theme colors, banner, animated avatar, decoration, profile effect, nameplate, name style, extras (verified check, owner crown), names (`username`, `displayName`), server settings per guildId (`partner`, `verified`, `boostLevel` 0–3, `boostCount`, local roles, local name/icon/banner), activities, profile music, layout, watermark (off by default). Save/load/delete/rename presets, built in: “Discord Staff”, “Nitro Supporter”, “OG 2015”. Import/export as `*.larp.json` (`{ version: 2, presets: [...] }`, version 1 is migrated on import), validate on import, image URLs only `https:` or `data:image/`. Settings tab “Larpcord” with sub-tabs and a live preview of your own profile. Optional watermark “🎭 Larpcord” in your own profile popout.
- **larpBadges:** Vencord's `@api/Badges` (`addProfileBadge`), own user ID only. All official badges (reference icons from Discord's client, copy nothing into the repo) plus custom badges, order via drag & drop. “Member since” on the profile.
- **larpNitro & larpDecorations:** Nitro badge with date, boost badge tier computed from the date, theme colors, banner, animated avatar, selecting decorations/profile effects/nameplates from Discord's collectibles store with preview. Use existing Vencord plugins for profile themes and decorations as a template.
- **larpName:** clan tag, verified check, owner crown, name styles (font, gradient, glow). **Name changer:** override username and display name locally and instantly, no cooldown, everywhere (chat, profile, member list, user panel, mentions, tooltips). Option “Show larp name instead of server nicknames” (on by default). Label it in the hub: “Only visible locally”.
- **larpActivity:** your own activities (all types including custom status) and an activity changer
  for real, detected activities. Only `SelfPresenceStore.getActivities()` and
  `PresenceStore.getActivities(id)` are patched; images go through a `larp:` key that a patch on
  `getAssetImage` resolves. The progress bar for “Listening” only exists because Discord then treats the activity as
  Spotify (name “Spotify”, `party.id` with a `spotify:` prefix).
- **larpServers:** server list in the hub, per server partner/verified icon, boost level and count. Only patch display
  (header, tooltip, boost display). Plus **local roles** (name, color, gradient, icon, order; shown via the
  roles section on the profile, the name color in chat and member list and a custom decorator icon) and
  **restyle servers** (name, icon, banner): `GuildStore` returns a display copy when reading, the image URLs
  come from patches on `getGuildIconURL`/`getGuildBannerURL`, and `guardGuildBody` keeps larp values out of
  `PATCH /guilds/<id>`.
- **larpMusic:** profile music. Songs live as a file in the app data folder (`desktop/src/main/larpMusic.ts`,
  served via `vesktop://music/<id>`) or as a URL. No patch: the mini player is attached as a profile badge to your
  own profile, so playback starts when it opens and stops when it closes.
- **larpThemes:** theme editor (colors, font, corner radius) with live preview via Vencord's Theme/QuickCSS, themes storable in presets, custom sounds, loading screen and app icon (in the `desktop/` part).
- **larpLayout** (build in stages):
  - **A)** Edit mode via hub toggle and Ctrl+Shift+L: frames and handles, clicks disabled, toolbar with “Done”, “Reset”, “Save as preset”. Identify elements by stable IDs (guild/channel IDs, aria-label), never by positions or minified classes.
  - **B)** Server list: apply your own order when rendering, new servers at the end, folders movable as a whole. Leave Discord's native drag & drop untouched.
  - **C)** DMs: right-click “Pin in Larpcord”, pinned ones at the top in a fixed order.
  - **D)** Reorder/hide buttons in the user panel and channel header via CSS `order`/`display`. The settings button can never be hidden.
  - **E)** User panel at the top or bottom. More areas later, ideas in `TODO.md`.
  - **Safety net:** starting with Shift held down or the tray entry resets the layout.

---

## Internationalization (i18n)

Larpcord's main language is English; German (and any future language) is selectable. The client follows Discord's
language setting, without restart.

- **Module:** `core/src/plugins/larpCore/i18n/` – `t(key, vars?)`, `tNode(key, vars)` for texts with React elements,
  `useLarpLocale()` in components, `formatLarpDate`/`formatLarpNumber`, `LarpError(key, vars)` + `errorText(e)`
  for translatable errors. The pure logic lives in `i18n/translator.ts` (without Vencord/Electron).
- **Language files:** `core/src/plugins/larpCore/i18n/locales/<language>.json`, flat keys
  (`"area.key": "Text with {variable}"`), plurals via `.one`/`.other`. `en.json` is the reference and the fallback.
  Another language needs **only a new JSON file** – the esbuild plugin `core/scripts/build/larpLocales.mjs` finds it
  automatically (virtual module `~larpcord-locales`, also in the desktop build).
- **Source of the language:** Discord's `LocaleStore` (not the system). The core reports it via IPC to the
  main process (`VesktopNative.larpcord.setLocale`), which remembers it in `settings.json` and rebuilds the tray, menu
  and own windows. Before login, the last reported language or the system language applies (fallback English).
- **Desktop:** `desktop/src/main/i18n.ts` (same language files), views use `data-i18n="desktop.…"` plus
  `desktop/static/views/i18n.js`; keys for views must start with `desktop.`.
- **Rules:** never freeze translated texts in module constants (use getters or translate at render time),
  plugin descriptions as getters, logger output stays untranslated.
- **Check:** `pnpm i18n:check` reports missing, unused and mismatching keys and runs in CI
  (`.github/workflows/ci.yml`). Register dynamic keys with a comment `// i18n-keys: prefix.*`.

## Auto-updater and release

- **Main process:** `desktop/src/main/updater.ts` (electron-updater, GitHub provider `aquaxs1/Larpcord`).
  Checks on startup and every 4 hours, downloads in the background, reports status to the core via IPC.
  Channel “Beta” = `allowPrerelease`. Dev and portable builds report `unsupported`.
- **Core:** `larpCore/updater/` (status client, Discord modal with changelog, safe release notes display) and
  the hub tab “Updates” (`hub/UpdatesTab.tsx`).
- **“Later”** means `autoInstallOnAppQuit`, not “forget”. Errors are only logged and shown in the hub.
- **Release:** tag `v*` → GitHub Action builds, uploads `Larpcord-Setup.exe`, `latest.yml`, the blockmap and
  `Larpcord-Setup.zip` (the website links to the ZIP). Tags with `-beta` become prereleases.
  The release text comes from `CHANGELOG.md` (`scripts/release-notes.mjs`, written in English) and is also the
  changelog in the update notice. Publishing locally needs `GH_TOKEN` from `.env` (never commit it).
- **Installer:** NSIS oneClick per user (`desktop/build/installer.nsh`), dark color scheme via
  `MUI_CUSTOMFUNCTION_GUIINIT`, custom icons, English/German. The uninstaller asks about user data,
  but not on updates (`${isUpdated}`) and not in silent mode.
- **Testing without risk:** always build test packages with their own `appId`, own `extraMetadata.name` **and**
  `extraMetadata.productName`, otherwise they share the data folder and single-instance lock with the user's
  installed Larpcord.

## Website

`site/` is a static site (HTML/CSS/JS, no build) deployed on Vercel with root directory `site`. English only.
`index.html` (new tools, live “try it” preview, what you can larp, differences to regular Discord, download),
`privacy.html` (served as `/privacy`), `vercel.json` (clean URLs, security headers/CSP). The download button reads
the latest release via the GitHub API and prefers the `.zip` asset. No cookies, no tracking, no external fonts.

## Logo

`assets/larpcordlogo.png` is the only source. `python scripts/generate-icons.py` generates all
icons from it (EXE, installer, tray, loading screen, window) and `core/src/plugins/larpCore/assets/logo.png`, which is
embedded in the core as a data URL via `larpCore/logo.ts`. A new logo means: replace the file, run the script.
`site/assets/logo.png` is a copy for the website.

## Phases

One after another; after each phase build, run, test, summarize briefly.

0. **Base:** create the forks. Root `package.json` with `build`, `dev`, `package`. Change Vesktop so the bundled Larpcord core is loaded from the app resources instead of downloading Vencord from GitHub (look for the download logic in `desktop/src/main`). Rebranding: name “Larpcord”, appId `dev.larpcord.app`, window title, tray, installer `Larpcord-Setup.exe`, placeholder icon. Do NOT rename internal Vencord identifiers.
   *Done when:* the .exe starts, login works, settings section “Larpcord” is visible.
1. **larpCore** (done when hub, persistence, presets, import/export work)
2. **larpBadges**
3. **larpNitro & larpDecorations**
4. **larpName**
5. **larpServers**
6. **larpThemes**
7. **larpLayout** (done when servers and DMs can be moved, that persists after restart and the real order in regular Discord is unchanged)
8. **Polish:** all larp plugins enabled by default under category “Larpcord”, test a deliberately broken patch (the client must keep running), GitHub Action builds the .exe as a release on tag `v*`.

### Status (2026-09-26)

| Phase | Status |
|---|---|
| 0 Base | done |
| 1 larpCore | done (incl. names, layout in the store, patch status in the log) |
| 2 larpBadges | done |
| 3 larpNitro & larpDecorations | done |
| 4 larpName | done (incl. name changer and “Larp name instead of server nicknames”) |
| 5 larpServers | done |
| 6 larpThemes | done |
| 7 larpLayout | done: stages A–E and safety net. More areas see `TODO.md` |
| 8 Polish | done: all plugins enabled by default under “Larpcord”, broken-patch test passed, release workflow, README |

After that came the big update from `TODO.md`:

| Section | Status |
|---|---|
| 1 Multiple languages | done (en/de, live switching, `pnpm i18n:check` in CI) |
| 2 Auto-updater | done, end-to-end test with a local update server |
| 3 Discord-style installer | done (oneClick, dark, custom icons, setup splash, onboarding, uninstaller question) |
| 4 larpActivity | done |
| 5 Local roles | done (own group in the member list deliberately left out, see `TODO.md`) |
| 6 Restyle servers | done |
| 7 Profile music | done |
| 8 Wrap-up | done (preset format v2, export warning, README, changelog) |
| Website | done (`site/`, English) |
| English as main language | done for website and repo docs |

### Testing

- **Reporter build** (`pnpm build --reporter --dev --disable-updater` in `core/`): loads all lazy chunks on startup and reports every patch that doesn't find its module (“found no module”), has no effect (“had no effect”) or fails (“errored”). Run it before every commit with new patches.
- **Reporter builds enable all plugins** (`enabled: IS_REPORTER || …`). If the reporter says “had no effect”,
  an upstream plugin may have patched the same spot first (e.g. IrcColors for the name color).
- **Backreferences (`\1`) never belong in a lookbehind:** JS evaluates lookbehinds right to left, the
  reference then points to nothing and the patch doesn't apply.
- **Replacements right after `return`** need a leading space (`return(0,…)` otherwise becomes `return$self…` → crash). Vencord doesn't catch runtime errors in replacements, so always put logic into `$self` functions with try/catch.

---

## README

English `README.md`: description, features, section “What Larpcord can't do” (only cosmetic/local, real name and real server order stay), installation and building it yourself (Node 22+, pnpm), structure table core/desktop/site, note that client mods violate Discord's Terms of Service and use is at your own risk, request not to deceive others with fake badges, GPL-3.0, “not affiliated with Discord Inc.”

---

## Way of working

- **Patch locations:** find them with Vencord's dev tools (webpack search) via stable strings; prefer stable strings over minified variable names. When unsure, use existing Vencord plugins as a reference instead of guessing.
- **Commits:** small and descriptive, in English, one commit per feature.
- **Building:** `pnpm install` (also installs `core/` and `desktop/` via `postinstall`), then `pnpm build`, `pnpm dev` or `pnpm package`. On Windows without a global pnpm: `ship.bat` (uses corepack).
