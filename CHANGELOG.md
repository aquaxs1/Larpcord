# Changelog

All notable changes to Larpcord. The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and versions follow [Semantic Versioning](https://semver.org/). The sections here automatically become
the GitHub release text and the changelog in the in-app update notice (`scripts/release-notes.mjs`).

## [Unreleased]

### Added
- **Website** in `site/` (static, deploy on Vercel with root `site`): new tools, a live “try it” preview,
  download, comparison with regular Discord and a privacy page.
- Releases additionally include `Larpcord-Setup.zip` (the setup .exe as a ZIP), which the website links to.

### Changed
- English is now the main language of the project: website, README, changelog, release notes and repository
  docs are in English. Other languages (currently German) remain selectable in the client.

## [0.2.0] – 2026-09-23

### Added
- **Multiple languages:** Larpcord speaks English and German and follows Discord's language setting – no restart needed.
  Additional languages only need a new JSON file in `core/src/plugins/larpCore/i18n/locales/`.
- **Auto-updater:** Larpcord checks for new versions on startup and every 4 hours, downloads them in the background and
  shows a Discord-style notice with the changelog (“Restart now” / “Later”). “Stable” and “Beta” channels,
  can be turned off in the hub under “Updates”.
- **Discord-style installer:** one-click per-user installation, dark color scheme, custom icons, followed by a
  splash screen and a short onboarding on first launch. When uninstalling, Larpcord asks whether presets and
  settings should be kept.
- **Activities (new):** make up your own activities – Playing, Listening, Watching, Streaming, Competing or a custom
  status, with images, party size, buttons and timestamps (with a progress bar for music). Plus an
  activity changer that locally renames, re-images or hides real detected activities.
  No presence updates are sent: others keep seeing your real activity.
- **Local roles (new):** your own roles per server with color, gradient and icon. They appear as role pills
  on your own profile, color your name in chat and the member list and put an icon next to your name.
  Templates for Owner, Admin, Moderator and VIP. They grant no permissions.
- **Restyle servers (new):** change a server's name, icon and banner locally (URL or file, GIFs allowed),
  including “Reset to original”. The server itself stays unchanged.
- **Profile music (new):** your own song on your own profile, as a file (mp3, ogg, wav, m4a, up to 20 MB) or as a URL.
  With volume, start time, loop, fade in/out, a mini player on the profile and a global mute switch.

### Changed
- Larpcord no longer loads anything from Vencord or Vesktop servers (donor badges, cloud sync and updater removed).
- New official logo everywhere: app icon, installer, tray, loading screen, hub and watermark.
- Export files now have `version: 2`. Older `*.larp.json` files (version 1) can still be imported.
- Exports can embed the song file; if that makes the file large, Larpcord asks first.

## [0.1.0] – 2026-09-19

### Added
- First version: standalone Discord client with the Larpcord Hub, badges, Nitro look, decorations, names, server badges,
  themes and a custom layout. Everything visible only locally.
