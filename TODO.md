# Larpcord – TODO: Big update

Work through these in order. After each section: build, run, test and tick the boxes.
Add new findings, problems and postponed items below under “Open / Later”.

---

## 1. Multiple languages (first, because all new texts build on it)

- [x] i18n module in `larpCore/i18n/` with `t(key, vars?)`
- [x] Language files `locales/en.json` and `locales/de.json` (required), fallback is always `en`
- [x] Read Discord's language from Discord's locale store, not from the system
- [x] Apply language changes in Discord live, without restart (subscribe to locale changes, re-render the UI)
- [x] Move all existing Larpcord texts (hub, plugins, presets, tooltips, error messages) to `t()`
- [x] Desktop part (tray, updater dialogs, onboarding, splash): the renderer sends the locale to the main process via IPC; before login use the system language
- [x] Translate built-in preset names (displayed via keys, not as fixed text)
- [x] Check script `pnpm i18n:check`: reports missing or unused keys in all language files, runs in CI
- [x] Structure it so that further languages only need a new JSON file

**Done when:** switching Discord to English → all Larpcord texts are English immediately; back to German → German immediately.

---

## 2. Auto-updater (very important)

- [x] Set up `electron-updater` with the GitHub provider (own Larpcord repo) in the desktop part
- [x] Remove Vesktop's own update check and all Vencord update/download mechanisms or redirect them to Larpcord. Nothing may be loaded from Vencord or Vesktop servers anymore
- [x] The core ships with the app, so one app update updates everything at once
- [x] Check on startup and every 4 hours
- [x] Download updates in the background, then a Discord-style notice: version, changelog (from the release notes), buttons “Restart now” and “Later”
- [x] With “Later”, install automatically on the next quit
- [x] Hub settings: auto-update on/off, channel “Stable” / “Beta” (Beta = GitHub prereleases), “Check for updates now” button, show the current version
- [x] Log errors (no internet, rate limit, broken download) quietly, never block the client
- [x] Adjust the GitHub Action: on tag `v*` build and publish with `latest.yml` (`--publish always`, `GH_TOKEN`), tags with `-beta` as prerelease
- [x] Document in the README: without code signing Windows SmartScreen shows a warning, updates still work
- [x] Test: install version `0.0.1`, release `0.0.2` → the update is detected, downloaded and installed

**Done when:** the test run above works end to end.

---

## 3. New Discord-style installer

Important: must stay compatible with `electron-updater`, so keep the NSIS target (no Squirrel).

- [x] NSIS `oneClick` with per-user installation: no old-fashioned wizard pages, just a short progress bar
- [x] Custom icons for installer, uninstaller and header, dark color scheme
- [x] Optionally checked: borderless splash window during installation → moved to “Open / Later” (see below)
- [x] After installation Larpcord starts straight into a modern splash screen (“Setting up Larpcord…”) in the Discord look: dark background, rounded corners, animated Larpcord logo, progress text
- [x] Onboarding on first launch (own window, Discord style, 3 to 4 steps): welcome, note “Everything is only visible locally” plus Terms of Service note, choose a starting preset, watermark on/off
- [x] Uninstaller asks: “Keep settings and presets?”
- [x] Installer texts in English and German (NSIS multi-language, based on system language)
- [x] Use the Larpcord logo, **no** Discord logo and no Discord wordmark. Discord-like colors and shapes are fine

**Done when:** installing feels like Discord: click, short progress, straight into a nice splash and onboarding.

---

## 4. Activities: fake activity & activity changer (new plugin `larpActivity`)

**Hard rule:** local display only. No presence updates over the gateway, no Rich Presence registration. Unlike Vencord's CustomRPC, this activity must not be visible to others. Implemented by patching the activities the client displays for your own user ID.

- [x] Create your own activities, several at once
- [x] Type: Playing, Listening, Watching, Streaming, Competing, custom status
- [x] Every field editable: name, details, state line, large image, small image, tooltip texts for both images, party size (e.g. 2 of 4), buttons (display only, no action)
- [x] Images as URL or uploaded file
- [x] Time: “elapsed X” (start time), “X left” (end time), fixed value or running live. For “Listening” a Spotify-like progress bar
- [x] Custom status with emoji and text
- [x] **Activity changer:** change real detected activities (e.g. a running game) locally: override icon, texts, time or hide them entirely. Rules stored per application
- [x] Editor in the hub with a live preview of how the activity looks on the profile and in the member list
- [x] Shown wherever your own activity appears: profile popout, profile modal, member list, DM list, user panel
- [x] Activities are part of presets

---

## 5. Local roles (extension of `larpServers`)

**Hard rule:** never insert fake roles into structures Discord computes permissions from. Display only, otherwise admin buttons appear that fail server-side.

- [x] Create your own roles per server: name, color, optional gradient, optional role icon (URL or file)
- [x] Roles can be assigned to yourself, order is configurable
- [x] Display: role pills on your own profile on the server, name color in chat and member list from the highest larp role, role icon next to the name
- [x] Templates: “Owner” (red), “Admin”, “Moderator”, “VIP”
- [x] Checked: own group at the top of the member list → moved to “Open / Later” (see below)
- [x] Part of presets

---

## 6. Restyle servers (extension of `larpServers`)

- [x] Change locally per server: name, icon, banner
- [x] Icon and banner as URL or file, GIFs allowed
- [x] Shown everywhere: server list including tooltip, server header, banner at the top of the channel list, server settings overview, server mentions
- [x] Implemented via the functions that build icon and banner URLs plus the name display. Never permanently modify guild objects in the store
- [x] “Reset to original” per server
- [x] Part of presets

---

## 7. Profile music (new plugin `larpMusic`)

- [x] Song as a local file (mp3, ogg, wav, m4a) or URL
- [x] Store files in the app data folder (via IPC in the desktop part), not in the DataStore (size). At most 20 MB per file
- [x] Plays when opening your own profile popout or profile modal, stops when closing
- [x] Settings: volume, start position in the song, loop, fade in and out
- [x] Small mini player on the profile (title, pause, mute)
- [x] Global mute switch in the hub
- [x] Ship no songs, only users' own files
- [x] Part of presets (reference to the file, embedding on export see section 8)

---

## 8. Wrap-up

- [x] Bump the preset format to `version: 2`, migrate v1 automatically
- [x] Show a size warning when exporting with embedded files (images, music)
- [x] Guard all new patches with a fallback, deliberately break one and check that the client keeps running
- [x] `pnpm i18n:check` passes
- [x] Update `CLAUDE.md`: new plugins, new hard rules (no presence updates, no roles in permissions), updater and installer structure
- [x] Update `README.md`: new features, updater, SmartScreen note, languages
- [x] Bump the version, changelog in `CHANGELOG.md`, set the release tag (v0.2.0, 2026-09-24)

---

## 9. Added later by the user
- [x] Use larpcordlogo.png everywhere as the official logo
- [x] Make sure the background always matches the settings (theme, transitions, etc.)
- [x] Repository: https://github.com/aquaxs1/Larpcord
- [x] The token for updates lives in `.env` (`GH_TOKEN`, not in the repo)
- [x] Website in `site/` (Vercel root `site`)
- [x] English is the main language (website, README, changelog, repo docs); other languages only selectable in the client

## Open / Later

_(Items that could not be implemented reliably end up here, with a short reason.)_

### Not possible without write requests / server-side checks
- **Real Nitro features** (bigger uploads, HD streaming, emojis/stickers everywhere): checked by Discord's servers. Larpcord only sets `premiumType` on the *display* profile, never on the user object.
- **Server boost progress bar** in the channel list: the component syncs boost counters into a local store and opens boost purchase modals. A patch would be more than pure display (rule 3). Boosts are shown via the header gem and guild info instead.
- **Native server tag (`primaryGuild`) as clan tag**: when clicked, Discord fetches data of the tag's guild. A made-up tag would cause requests for servers that don't exist. Larpcord therefore shows the clan tag as its own decoration.

### Name changer: known limits
- **Default name when creating a server** (“<Name>'s server”) uses the larp name. The field is visible and editable before submitting, so it is not patched.
- **Member list** picks up a changed larp name with a hidden server nick only once Discord rebuilds the list (e.g. switching channels). Chat, user panel, profile and mentions update immediately.
- **Discord RPC nick** (module for games/overlays) is computed from display functions. The desktop client runs no RPC server, and the user is still serialized with the real name.

### Local roles: deliberately left out
- **Own group at the top of the member list:** the member list gets its groups (`hoist`) from a precomputed,
  virtualized row list of the server. An extra group would have to rebuild that list, including row heights
  and counters – that is more than pure display and breaks with every Discord update.
  Larp roles therefore appear as role pills on the profile, as name color and as an icon next to the name.

### larpLayout: later areas
- Channel list: reorder or hide a server's categories and channels locally.
- Member list on the left instead of the right, save sidebar widths.
- Title bar (inbox, help) and chat input buttons (gift, GIF, sticker, emoji): reorder/hide.
- Reorder servers inside folders locally (deliberately left out: folders only move as a whole so Discord's folder structure stays untouched).
- Toggles whose label changes with their state and that Discord doesn't translate as a pair (e.g. member list on/off) move to the end of the order after toggling.

### Installer: deliberately left out
- **Animated splash window during the NSIS installation** (`nsisSplash`/`newadvsplash`): would need an extra
  NSIS plugin in the build and only runs for a few seconds while the oneClick installer already shows progress.
  The splash right after installation (“Setting up Larpcord …”) covers the visible part.
- **Dark color scheme in the uninstall window:** MUI defines `un.onGUIInit` itself; only the installer is themed.

### Open ideas
- Clan tag, check mark and crown on the profile right next to the name instead of in the badge row (needs an extra profile patch).
- Hub preview using Discord's real profile component instead of a custom card.
