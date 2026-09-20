# Änderungen

Alle bemerkenswerten Änderungen an Larpcord. Das Format orientiert sich an [Keep a Changelog](https://keepachangelog.com/de/1.1.0/),
die Versionen folgen [Semantic Versioning](https://semver.org/lang/de/). Die Abschnitte hier landen automatisch
im GitHub-Release und im Update-Hinweis in der App (`scripts/release-notes.mjs`).

## [Unreleased]

### Neu
- **Mehrsprachigkeit:** Larpcord spricht Deutsch und Englisch und folgt dabei Discords Spracheinstellung – ohne Neustart.
  Weitere Sprachen brauchen nur eine neue JSON-Datei in `core/src/plugins/larpCore/i18n/locales/`.
- **Auto-Updater:** Larpcord prüft beim Start und alle 4 Stunden auf neue Versionen, lädt sie im Hintergrund und
  zeigt einen Hinweis im Discord-Stil mit Changelog („Jetzt neu starten“ / „Später“). Kanäle „Stabil“ und „Beta“,
  abschaltbar im Hub unter „Updates“.

### Geändert
- Larpcord lädt nichts mehr von Vencord- oder Vesktop-Servern (Donor-Badges, Cloud-Sync und Updater entfernt).
- Neues offizielles Logo überall: App-Icon, Installer, Tray, Ladebildschirm, Hub und Wasserzeichen.

## [0.1.0] – 2026-09-19

### Neu
- Erste Version: eigener Discord-Client mit Larpcord-Hub, Badges, Nitro-Optik, Dekorationen, Namen, Server-Abzeichen,
  Themes und eigenem Layout. Alles nur lokal sichtbar.
