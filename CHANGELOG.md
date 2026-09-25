# Änderungen

Alle bemerkenswerten Änderungen an Larpcord. Das Format orientiert sich an [Keep a Changelog](https://keepachangelog.com/de/1.1.0/),
die Versionen folgen [Semantic Versioning](https://semver.org/lang/de/). Die Abschnitte hier landen automatisch
im GitHub-Release und im Update-Hinweis in der App (`scripts/release-notes.mjs`).

## [Unreleased]

### Neu
- **Website** im Ordner `site/` (statisch, für Vercel mit Root `site`): neue Tools, Live-Vorschau zum Ausprobieren,
  Download, Vergleich mit dem normalen Discord und Datenschutz-Seite.
- Releases enthalten zusätzlich `Larpcord-Setup.zip` (die Setup-.exe als ZIP), auf die die Website verlinkt.

## [0.2.0] – 2026-09-23

### Neu
- **Mehrsprachigkeit:** Larpcord spricht Deutsch und Englisch und folgt dabei Discords Spracheinstellung – ohne Neustart.
  Weitere Sprachen brauchen nur eine neue JSON-Datei in `core/src/plugins/larpCore/i18n/locales/`.
- **Auto-Updater:** Larpcord prüft beim Start und alle 4 Stunden auf neue Versionen, lädt sie im Hintergrund und
  zeigt einen Hinweis im Discord-Stil mit Changelog („Jetzt neu starten“ / „Später“). Kanäle „Stabil“ und „Beta“,
  abschaltbar im Hub unter „Updates“.
- **Installer im Discord-Stil:** Ein-Klick-Installation pro Benutzer, dunkles Farbschema, eigene Icons, danach ein
  Splash-Screen und ein kurzes Onboarding beim ersten Start. Beim Deinstallieren fragt Larpcord, ob Presets und
  Einstellungen bleiben sollen.
- **Aktivitäten (neu):** eigene Aktivitäten erfinden – Spielt, Hört, Schaut, Streamt, Tritt an oder benutzerdefinierter
  Status, mit Bildern, Gruppengröße, Knöpfen und Zeitangaben (bei Musik mit Fortschrittsleiste). Dazu ein
  Aktivitäts-Changer, der echte erkannte Aktivitäten lokal umbenennt, neu bebildert oder ausblendet.
  Es werden keine Presence-Updates gesendet: Andere sehen weiterhin deine echte Aktivität.
- **Lokale Rollen (neu):** eigene Rollen pro Server mit Farbe, Farbverlauf und Icon. Sie erscheinen als Rollen-Pillen
  im eigenen Profil, färben den Namen in Chat und Mitgliederliste und setzen ein Icon neben den Namen.
  Vorlagen für Owner, Admin, Moderator und VIP. Rechte geben sie keine.
- **Server umgestalten (neu):** Name, Icon und Banner eines Servers lokal ändern (URL oder Datei, GIFs erlaubt),
  inklusive „Auf Original zurücksetzen“. Der Server selbst bleibt unverändert.
- **Profil-Musik (neu):** eigener Song im eigenen Profil, als Datei (mp3, ogg, wav, m4a, bis 20 MB) oder als URL.
  Mit Lautstärke, Startzeit, Schleife, Ein-/Ausblenden, Mini-Player im Profil und globalem Stumm-Schalter.

### Geändert
- Larpcord lädt nichts mehr von Vencord- oder Vesktop-Servern (Donor-Badges, Cloud-Sync und Updater entfernt).
- Neues offizielles Logo überall: App-Icon, Installer, Tray, Ladebildschirm, Hub und Wasserzeichen.
- Export-Dateien haben jetzt `version: 2`. Ältere `*.larp.json` (Version 1) lassen sich weiterhin importieren.
- Beim Export lässt sich die Song-Datei einbetten; wird die Datei dadurch groß, fragt Larpcord vorher nach.

## [0.1.0] – 2026-09-19

### Neu
- Erste Version: eigener Discord-Client mit Larpcord-Hub, Badges, Nitro-Optik, Dekorationen, Namen, Server-Abzeichen,
  Themes und eigenem Layout. Alles nur lokal sichtbar.
