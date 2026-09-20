# Larpcord – Bauplan für Claude Code

Du baust mit mir **Larpcord**: einen eigenständigen, quelloffenen Discord-Client (eigene .exe), mit dem Nutzer sich lokal Badges, Nitro-Optik, Dekorationen, Server-Badges, andere Namen und ein eigenes Layout geben können. Alles ist **nur auf dem eigenen PC** sichtbar. Lies zuerst `README.md` für die Feature-Übersicht.

## Grundansatz

Nicht bei null anfangen. Basis:
- `desktop/` = Fork von Vesktop (liefert die .exe via electron-builder)
- `core/` = Fork von Vencord (Plugin-System), unsere Plugins in `core/src/plugins/larp*/`

Beide als normale Ordner einchecken (kein Submodule, `.git` entfernen), Upstream-Commit-Hashes in `UPSTREAM.md` notieren. Lizenz bleibt GPL-3.0, Copyright-Hinweise behalten.

---

## Harte Regeln (niemals brechen)

1. **Nur lokal:** keine schreibenden Requests an die Discord-API (kein PATCH/POST auf `/users/@me`, `/guilds/...` usw.).
2. **Nur der eigene User:** Profil- und Namens-Overrides nur für die eigene User-ID (`UserStore.getCurrentUser().id`).
3. **Server-Badges nur Anzeige:** keine Guild-Features global verändern.
4. **Kein Selfbot-Verhalten:** keine automatisierten Nachrichten, Reaktionen, Joins.
5. **Discords eigene Server-Sortierung** (Account-Einstellungen, synchronisiert) nie verändern.
6. **Jeder Patch braucht einen Fallback:** Matcht ein `find` nicht mehr, darf nichts crashen, Feature wird deaktiviert und geloggt.
7. **Keine serverseitig geprüften Nitro-Funktionen vortäuschen** (Upload-Limits, Stream-Qualität), keine UI aktivieren, die dann serverseitig scheitert.
8. **Wenn etwas nur mit schreibenden API-Requests ginge:** weglassen und in `TODO.md` notieren.

---

## Repo-Struktur

```
larpcord/
├── README.md
├── CLAUDE.md                 ← diese Datei
├── TODO.md                   ← bewusst Weggelassenes, offene Ideen
├── UPSTREAM.md               ← Upstream-Commit-Hashes
├── package.json              ← Root-Skripte: build, dev, package
├── ship.bat                  ← Ein-Klick-Build des Installers unter Windows
├── scripts/                  ← build.mjs, install.mjs, set-version.mjs, generate-icons.py
├── core/                     ← Fork von Vencord
│   └── src/plugins/
│       ├── larpCore/         ← Store, Hub, Presets, Import/Export, Wasserzeichen
│       ├── larpBadges/
│       ├── larpNitro/
│       ├── larpDecorations/
│       ├── larpName/
│       ├── larpServers/
│       ├── larpThemes/
│       └── larpLayout/
└── desktop/                  ← Fork von Vesktop
```

Interne Vencord-Bezeichner (`Vencord.*`) **nicht** umbenennen, das macht Upstream-Merges kaputt. Nur sichtbare Namen heißen „Larpcord“.

---

## Plugins

- **larpCore:** zentraler Store (Vencord DataStore) mit `get`/`update`/`subscribe`. Enthält Badges, Custom-Badges (Bild + Tooltip), „Mitglied seit“, Clan-Tag, Nitro (seit/Boost seit), Profil-Theme-Farben, Banner, animierter Avatar, Dekoration, Profileffekt, Nameplate, Name-Style, Extras (Verified-Häkchen, Owner-Krone), Namen (`username`, `displayName`), Server-Einstellungen pro guildId (`partner`, `verified`, `boostLevel` 0–3, `boostCount`), Layout, Wasserzeichen (Standard aus). Presets speichern/laden/löschen/umbenennen, mitgeliefert: „Discord Staff“, „Nitro-Gönner“, „OG 2015“. Import/Export als `*.larp.json` (`{ version: 1, presets: [...] }`), beim Import validieren, Bild-URLs nur `https:` oder `data:image/`. Einstellungs-Tab „Larpcord“ mit Unter-Tabs und Live-Vorschau des eigenen Profils. Optionales Wasserzeichen „🎭 Larpcord“ im eigenen Profil-Popout.
- **larpBadges:** Vencords `@api/Badges` (`addProfileBadge`), nur eigene User-ID. Alle offiziellen Badges (Icons aus Discords Client referenzieren, nichts ins Repo kopieren) plus Custom Badges, Reihenfolge per Drag & Drop. „Mitglied seit“ im Profil.
- **larpNitro & larpDecorations:** Nitro-Badge mit Datum, Boost-Badge-Stufe aus Datum berechnet, Theme-Farben, Banner, animierter Avatar, Auswahl von Dekorationen/Profileffekten/Nameplates aus Discords Collectibles-Store mit Vorschau. Vorhandene Vencord-Plugins für Profil-Themes und Dekorationen als Vorlage nutzen.
- **larpName:** Clan-Tag, Verified-Häkchen, Owner-Krone, Name-Styles (Font, Gradient, Glow). **Name-Änderer:** Username und Anzeigename lokal sofort überschreiben, ohne Cooldown, überall (Chat, Profil, Mitgliederliste, User-Panel, Erwähnungen, Tooltips). Option „Larp-Name statt Server-Nicknames anzeigen“ (Standard an). Im Hub beschriften: „Nur lokal sichtbar“.
- **larpServers:** Serverliste im Hub, pro Server Partner-/Verified-Icon, Boost-Level und -Anzahl. Nur Anzeige patchen (Header, Tooltip, Boost-Anzeige).
- **larpThemes:** Theme-Editor (Farben, Font, Eckenradius) mit Live-Vorschau über Vencords Theme/QuickCSS, Themes in Presets speicherbar, eigene Sounds, Ladebildschirm und App-Icon (im `desktop/`-Teil).
- **larpLayout** (in Stufen bauen):
  - **A)** Bearbeitungsmodus per Hub-Toggle und Strg+Shift+L: Rahmen und Griffe, Klicks deaktiviert, Leiste mit „Fertig“, „Zurücksetzen“, „Als Preset speichern“. Elemente über stabile IDs identifizieren (Guild-/Channel-IDs, aria-label), nie über Positionen oder minifizierte Klassen.
  - **B)** Serverleiste: eigene Reihenfolge beim Rendern anwenden, neue Server ans Ende, Ordner als Ganzes verschiebbar. Discords natives Drag & Drop unberührt lassen.
  - **C)** DMs: per Rechtsklick „In Larpcord anpinnen“, angepinnte oben in fester Reihenfolge.
  - **D)** Buttons im User-Panel und Kanal-Header umsortieren/ausblenden per CSS `order`/`display`. Einstellungen-Button nie ausblendbar.
  - **E)** User-Panel oben oder unten. Weitere Bereiche erst später, Ideen in `TODO.md`.
  - **Sicherheitsnetz:** Start mit gedrückter Shift-Taste oder Tray-Eintrag setzt Layout zurück.

---

## Mehrsprachigkeit (i18n)

Larpcord spricht Deutsch und Englisch und folgt Discords Spracheinstellung, ohne Neustart.

- **Modul:** `core/src/plugins/larpCore/i18n/` – `t(key, vars?)`, `tNode(key, vars)` für Texte mit React-Elementen,
  `useLarpLocale()` in Komponenten, `formatLarpDate`/`formatLarpNumber`, `LarpError(key, vars)` + `errorText(e)`
  für übersetzbare Fehler. Die reine Logik steht in `i18n/translator.ts` (ohne Vencord/Electron).
- **Sprachdateien:** `core/src/plugins/larpCore/i18n/locales/<sprache>.json`, flache Schlüssel
  (`"bereich.schluessel": "Text mit {variable}"`), Mehrzahl über `.one`/`.other`. Eine weitere Sprache braucht
  **nur eine neue JSON-Datei** – das esbuild-Plugin `core/scripts/build/larpLocales.mjs` findet sie automatisch
  (virtuelles Modul `~larpcord-locales`, auch im Desktop-Build).
- **Quelle der Sprache:** Discords `LocaleStore` (nicht das System). Der Core meldet sie per IPC an den
  Main-Prozess (`VesktopNative.larpcord.setLocale`), der sie in `settings.json` merkt und Tray, Menü und eigene
  Fenster neu aufbaut. Vor dem Login gilt die zuletzt gemeldete bzw. die Systemsprache.
- **Desktop:** `desktop/src/main/i18n.ts` (gleiche Sprachdateien), Views nutzen `data-i18n="desktop.…"` plus
  `desktop/static/views/i18n.js`; Schlüssel für Views müssen mit `desktop.` beginnen.
- **Regeln:** keine übersetzten Texte in Modul-Konstanten einfrieren (Getter oder erst beim Rendern übersetzen),
  Plugin-Beschreibungen als Getter, Logger-Ausgaben bleiben unübersetzt.
- **Prüfen:** `pnpm i18n:check` meldet fehlende, überflüssige und abweichende Schlüssel und läuft in CI
  (`.github/workflows/ci.yml`). Dynamische Schlüssel mit Kommentar `// i18n-keys: prefix.*` anmelden.

## Auto-Updater und Release

- **Main-Prozess:** `desktop/src/main/updater.ts` (electron-updater, GitHub-Provider `aquaxs1/Larpcord`).
  Prüft beim Start und alle 4 Stunden, lädt im Hintergrund, meldet den Status per IPC an den Core.
  Kanal „Beta“ = `allowPrerelease`. Dev- und portable Builds melden `unsupported`.
- **Core:** `larpCore/updater/` (Status-Client, Discord-Modal mit Changelog, sichere Release-Notes-Anzeige) und
  der Hub-Tab „Updates“ (`hub/UpdatesTab.tsx`).
- **„Später“** heißt `autoInstallOnAppQuit`, nicht „vergessen“. Fehler werden nur geloggt und im Hub gezeigt.
- **Release:** Tag `v*` → GitHub Action baut, `electron-builder --publish always` lädt `Larpcord-Setup.exe`,
  `latest.yml` und Blockmap hoch. Tags mit `-beta` werden über `EP_PRE_RELEASE` zum Prerelease.
  Der Release-Text kommt aus `CHANGELOG.md` (`scripts/release-notes.mjs`) und ist zugleich der Changelog im
  Update-Hinweis. Lokales Veröffentlichen braucht `GH_TOKEN` aus `.env` (nie committen).
- **Installer:** NSIS oneClick pro Benutzer (`desktop/build/installer.nsh`), dunkles Farbschema über
  `MUI_CUSTOMFUNCTION_GUIINIT`, eigene Icons, Deutsch/Englisch. Die Deinstallation fragt nach den Nutzerdaten,
  aber nicht bei Updates (`${isUpdated}`) und nicht im Silent-Modus.
- **Testen ohne Risiko:** Testpakete immer mit eigener `appId`, eigenem `extraMetadata.name` **und**
  `extraMetadata.productName` bauen, sonst teilen sie sich Datenordner und Einzelinstanz-Sperre mit der
  installierten Larpcord-Version des Users.

## Logo

`assets/larpcordlogo.png` ist die einzige Quelle. `python scripts/generate-icons.py` erzeugt daraus alle
Icons (EXE, Installer, Tray, Ladebildschirm, Fenster) und `core/src/plugins/larpCore/assets/logo.png`, das im
Core über `larpCore/logo.ts` als Data-URL eingebettet wird. Ein neues Logo heißt: Datei austauschen, Skript laufen lassen.

## Phasen

Nacheinander, nach jeder Phase bauen, starten, testen, kurz zusammenfassen.

0. **Basis:** Forks anlegen. Root-`package.json` mit `build`, `dev`, `package`. Vesktop so umbauen, dass der mitgelieferte Larpcord-Core aus den App-Ressourcen geladen wird statt Vencord von GitHub herunterzuladen (in `desktop/src/main` nach der Download-Logik suchen). Rebranding: Name „Larpcord“, appId `dev.larpcord.app`, Fenstertitel, Tray, Installer `Larpcord-Setup.exe`, Platzhalter-Icon. Interne Vencord-Bezeichner NICHT umbenennen.
   *Fertig, wenn:* .exe startet, Login geht, Einstellungs-Bereich „Larpcord“ sichtbar.
1. **larpCore** (fertig, wenn Hub, Persistenz, Presets, Import/Export funktionieren)
2. **larpBadges**
3. **larpNitro & larpDecorations**
4. **larpName**
5. **larpServers**
6. **larpThemes**
7. **larpLayout** (fertig, wenn Server und DMs verschiebbar sind, das nach Neustart bleibt und die echte Reihenfolge im normalen Discord unverändert ist)
8. **Feinschliff:** alle Larp-Plugins standardmäßig aktiv unter Kategorie „Larpcord“, absichtlich kaputten Patch testen (Client muss weiterlaufen), GitHub Action baut bei Tag `v*` die .exe als Release.

### Stand (2026-09-20)

| Phase | Stand |
|---|---|
| 0 Basis | fertig |
| 1 larpCore | fertig (inkl. Namen, Layout im Store, Patch-Status im Log) |
| 2 larpBadges | fertig |
| 3 larpNitro & larpDecorations | fertig |
| 4 larpName | fertig (inkl. Name-Änderer und „Larp-Name statt Server-Nicknames“) |
| 5 larpServers | fertig |
| 6 larpThemes | fertig |
| 7 larpLayout | fertig: Stufen A–E und Sicherheitsnetz. Weitere Bereiche siehe `TODO.md` |
| 8 Feinschliff | fertig: alle Plugins standardmäßig aktiv unter „Larpcord“, Test mit absichtlich kaputten Patches bestanden, Release-Workflow, README |

Danach läuft das große Update aus `TODO.md`:

| Abschnitt | Stand |
|---|---|
| 1 Mehrsprachigkeit | fertig (de/en, Live-Wechsel, `pnpm i18n:check` in CI) |
| 2 Auto-Updater | fertig, Ende-zu-Ende-Test mit lokalem Update-Server |
| 3 Installer im Discord-Stil | oneClick, dunkel, Icons, Uninstaller-Frage fertig; Setup-Splash und Onboarding offen |
| 4 larpActivity | offen |
| 5 Lokale Rollen | offen |
| 6 Server umgestalten | offen |
| 7 Profil-Musik | offen |
| 8 Abschluss | offen |

### Testen

- **Reporter-Build** (`pnpm build --reporter --dev --disable-updater` in `core/`): lädt beim Start alle Lazy-Chunks und meldet jeden Patch, der sein Modul nicht findet („found no module“), nicht greift („had no effect“) oder fehlschlägt („errored“). Vor jedem Commit mit neuen Patches laufen lassen.
- **Ersetzungen direkt nach `return`** brauchen ein führendes Leerzeichen (`return(0,…)` wird sonst zu `return$self…` → Absturz). Laufzeitfehler in Ersetzungen fängt Vencord nicht ab, deshalb Logik immer in `$self`-Funktionen mit try/catch.

---

## README

Deutsche `README.md`: Beschreibung, Features, Abschnitt „Was Larpcord nicht kann“ (nur kosmetisch/lokal, echter Name und echte Server-Reihenfolge bleiben), Installation und Selbst-bauen (Node 22+, pnpm), Aufbau-Tabelle core/desktop, Hinweis, dass Client-Mods gegen Discords Nutzungsbedingungen verstoßen und die Nutzung auf eigenes Risiko erfolgt, Bitte, andere nicht mit Fake-Badges zu täuschen, GPL-3.0, „nicht mit Discord Inc. verbunden“.

---

## Arbeitsweise

- **Patch-Stellen** mit Vencords Dev-Tools (Webpack-Suche) über stabile Strings finden, lieber stabile Strings als minifizierte Variablennamen. Bei Unsicherheit bestehende Vencord-Plugins als Referenz nutzen statt zu raten.
- **Commits:** klein und beschreibend, ein Commit pro Feature.
- **Bauen:** `pnpm install` (installiert per `postinstall` auch `core/` und `desktop/`), dann `pnpm build`, `pnpm dev` oder `pnpm package`. Unter Windows ohne globales pnpm: `ship.bat` (nutzt corepack).
