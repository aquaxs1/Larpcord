<p align="center"><img src="assets/larpcordlogo.png" width="160" alt="Larpcord"></p>

# Larpcord

**The Discord client where you can be anyone. At least on your own screen.**

Larpcord is an open-source, standalone Discord client (its own `.exe`) that lets you give yourself badges, the Nitro look, avatar decorations, profile effects, server badges, a different name and your own layout – locally. Everything Larpcord changes is **visible only on your PC**. Nobody else sees it, and your account is never changed.

> Larp (Live Action Role Play): pretending. That's exactly what Larpcord does.

🌐 **Website:** try Larpcord in your browser and download it from the project website (source in [`site/`](site/)).

---

## ✨ Features

### 🏅 Badges & profile
- All official badges, locally: Discord Staff, Partner, HypeSquad (Events, Bravery, Brilliance, Balance), Early Supporter, Bug Hunter (level 1 & 2), Active Developer, Moderator Alumni, Early Verified Bot Developer
- Custom badges with your own image (PNG/GIF/SVG) and tooltip text
- Any “Member since” date
- Your own clan tag next to your name

### 💎 Nitro look
- Nitro badge with any subscription length (including boost badge tiers)
- Profile themes with gradients, custom banner, animated avatar (local GIF)
- Every avatar decoration, profile effect and nameplate from the shop, selectable locally
- Display name styles: fonts, gradients, glow

### 🏰 Server badges
- Partner or verified badge for any server
- Boost level (1 to 3) and boost count, freely adjustable
- Configurable per server

### 🎮 Activities
- Make up your own activities: Playing, Listening, Watching, Streaming, Competing or a custom status
- Every field is yours: name, details, state line, large and small image with tooltips, party size, buttons
- “Elapsed” and “remaining” timestamps, fixed or running, with a progress bar for music
- **Activity changer:** rename real detected activities locally, give them new images or hide them completely
- Local only: no presence updates are sent, others keep seeing your real activity

### 🎖️ Local roles
- Your own roles per server: name, color, gradient and role icon
- Role pills on your own profile, name color in chat and member list, icon next to your name
- Templates for Owner, Admin, Moderator and VIP
- Display only: larp roles grant no permissions and never show up in Discord's permission system

### 🖼️ Restyle servers
- Change a server's name, icon and banner locally (URL or file, GIFs allowed)
- Works everywhere: server list, server header, banner above the channel list, mentions
- “Reset to original” per server; the server itself stays untouched

### 🎵 Profile music
- Your own song on your own profile, as a file (mp3, ogg, wav, m4a, up to 20 MB) or as a URL
- Plays while your profile is open, with volume, start time, loop and fade in/out
- Mini player on the profile and a global mute switch in the hub
- Larpcord ships no songs, only your own files

### 🪪 Name changer
- Change your username and display name locally, instantly, without cooldown
- Applies everywhere: chat, profile, member list, user panel, mentions, tooltips
- Optional: show your larp name instead of server nicknames (on by default)
- Your real name on Discord stays unchanged. Even when Discord's account form is prefilled with the larp name, Larpcord never sends it to Discord.

### 🧩 Custom layout
- Edit mode in the hub or with **Ctrl+Shift+L**: drag elements, toolbar with “Done”, “Reset” and “Save as preset”
- Sort the server list freely (folders as a whole), new servers are added at the end automatically
- Right-click a DM → “Pin in Larpcord”; pinned DMs stay at the top in a fixed order
- Reorder or hide buttons in the user panel and channel header (the settings button always stays visible)
- User panel at the top or bottom
- Safety net: **hold Shift on startup** or pick “Reset layout” in the tray menu

### 🎭 Larp extras & presets
- Verified check and server owner crown next to your name
- **Larp presets**: save complete setups and switch with one click, e.g. “Discord Staff”, “Nitro Supporter”, “OG 2015”
- Import/export all settings as `.larp.json` to share with friends (song files can be embedded on request)
- Optional “Larpcord” watermark on your profile (off by default)

### 🎨 UI & themes
- Theme editor with live preview (colors, fonts, corner radius)
- Custom sounds, custom loading screen, custom app icon

### 🌍 Language
- English by default. Other languages (currently German) can be picked in the client: Larpcord follows your Discord language setting
- Switching takes effect immediately, no restart

### 🔄 Updates
- Larpcord updates itself from the official GitHub releases (on startup and every 4 hours)
- Updates download in the background, followed by a notice with the changelog: **Restart now** or **Later**
- **Stable** and **Beta** channels, can be turned off under **Larpcord Hub → Updates**

### ⚙️ Larpcord Hub
All settings in one place, with a live preview of your profile: **Settings → Larpcord → Larpcord Hub** (sub-tabs Badges, Nitro, Decorations, Name, Activity, Servers, Themes, Music, Layout, Presets, Updates).
Loading screen, tray and app icon are under **Settings → Larpcord → Larpcord Desktop → Customize App Assets**.

---

## ❗ What Larpcord can't do

Larpcord is **purely cosmetic and local**. Everything Discord's servers check stays exactly as it is:

- No bigger uploads, no real HD streaming, no real server boosts
- Other users do **not** see your larp badges, decorations or larp name
- Your real name stays: others keep seeing your real username and display name
- Your real server order stays: the layout only exists in Larpcord; regular Discord (and your phone) look the same as before
- Your account, your servers and your roles are never changed
- Larp activities never reach the gateway: others keep seeing your real activity on your profile
- Larp roles grant no permissions, and a locally renamed server keeps its name for everyone else

---

## 🚀 Installation

1. Download the latest release from [Releases](https://github.com/aquaxs1/Larpcord/releases) (`Larpcord-Setup.zip` or `Larpcord-Setup.exe`)
2. Run `Larpcord-Setup.exe` – one click, a short progress bar, done (installed just for you, no admin rights needed)
3. On first launch a short onboarding walks you through the most important settings
4. Log in with your Discord account and get started under Settings → **Larpcord**

> **Windows SmartScreen:** Larpcord is not code-signed (certificates cost money). On first launch Windows therefore
> shows “Windows protected your PC” → **More info** → **Run anyway**.
> Automatic updates install without this warning afterwards.

Larpcord lets you know as soon as a new version is available and installs it right away if you want.
Uninstall via **Settings → Apps**; Larpcord then asks whether your presets and settings should be kept.

### Build it yourself

Requirements: [Node.js](https://nodejs.org) 22+, [pnpm](https://pnpm.io) 11+, Git

```bash
git clone https://github.com/aquaxs1/Larpcord.git
cd Larpcord
pnpm install      # also installs core/ and desktop/
pnpm build        # builds core and desktop
pnpm package      # creates desktop/dist/Larpcord-Setup.exe
```

More commands:

| Command | Purpose |
|---|---|
| `pnpm dev` | Build a dev build and start Larpcord straight from source |
| `pnpm icons` | Regenerate all icons from `assets/larpcordlogo.png` (needs Python + Pillow) |
| `pnpm i18n:check` | Checks the language files for missing or unused keys |

A release is created automatically as soon as a `v*` tag is pushed (see `.github/workflows/release.yml`):
it builds `Larpcord-Setup.exe` plus `latest.yml` (so the auto-updater finds the version) and `Larpcord-Setup.zip`
(linked from the website). Tags with `-beta` (e.g. `v0.3.0-beta.1`) are published as prereleases on the **Beta** channel.

**Contributing a language:** copy `core/src/plugins/larpCore/i18n/locales/en.json` under the language code
(e.g. `fr.json`), translate it and run `pnpm i18n:check` – that's all it takes. English is the reference language.

### Website

The project website lives in `site/` (plain HTML/CSS/JS, no build step). On Vercel, choose `site` as the
Root Directory and “Other” as the framework. Preview locally with `npx serve site`. Fill in the controller
placeholders in `site/privacy.html` before publishing.

---

## 🧱 Structure

Larpcord stands on the shoulders of two great open-source projects:

| Folder | Based on | Role |
|---|---|---|
| `core/` | [Vencord](https://github.com/Vendicated/Vencord) | Client mod with all Larpcord plugins |
| `desktop/` | [Vesktop](https://github.com/Vencord/Vesktop) | Standalone desktop app (`.exe`) |
| `site/` | – | Project website |

The Larpcord plugins live in `core/src/plugins/larp*/`.

---

## ⚠️ About Discord's Terms of Service

Modified Discord clients violate [Discord's Terms of Service](https://discord.com/terms). Bans for purely cosmetic mods are rare, but possible. **Use at your own risk.**

Larpcord sends no automated requests to Discord and changes nothing on your account.

**Please don't use Larpcord to deceive others**, for example with screenshots of fake Staff badges. That's what the optional watermark is for.

---

## 🤝 Contributing

Pull requests are welcome! New badges, themes or presets? Just open an issue.

## 📄 License

GPL-3.0, like Vencord and Vesktop, which Larpcord is based on.
Larpcord is not affiliated with Discord Inc.
