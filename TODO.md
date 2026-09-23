# Larpcord – TODO: Großes Update

In dieser Reihenfolge abarbeiten. Nach jedem Abschnitt bauen, starten, testen und Häkchen setzen.
Neue Erkenntnisse, Probleme und verschobene Punkte unten unter „Offen / Später“ eintragen.

---

## 1. Mehrsprachigkeit (zuerst, weil alle neuen Texte darauf aufbauen)

- [x] i18n-Modul in `larpCore/i18n/` mit `t(key, vars?)`
- [x] Sprachdateien `locales/de.json` und `locales/en.json` (Pflicht), Fallback immer `en`
- [x] Discord-Sprache über Discords Locale-Store auslesen, nicht über das System
- [x] Sprachwechsel in Discord live übernehmen, ohne Neustart (auf Locale-Änderung subscriben, UI neu rendern)
- [x] Alle bestehenden Larpcord-Texte (Hub, Plugins, Presets, Tooltips, Fehlermeldungen) auf `t()` umstellen
- [x] Desktop-Teil (Tray, Updater-Dialoge, Onboarding, Splash): Renderer schickt Locale per IPC an den Main-Prozess, vor dem Login Systemsprache nutzen
- [x] Mitgelieferte Preset-Namen übersetzen (Anzeige über Schlüssel, nicht als fester Text)
- [x] Check-Skript `pnpm i18n:check`: meldet fehlende oder überflüssige Schlüssel in allen Sprachdateien, läuft in CI
- [x] Struktur so, dass weitere Sprachen nur eine neue JSON-Datei brauchen

**Fertig, wenn:** Discord auf Englisch umstellen → alle Larpcord-Texte sofort Englisch, zurück auf Deutsch → sofort Deutsch.

---

## 2. Auto-Updater (sehr wichtig)

- [x] `electron-updater` mit GitHub-Provider (eigenes Larpcord-Repo) im Desktop-Teil einrichten
- [x] Vesktops eigenen Update-Check und alle Vencord-Update-/Download-Mechanismen entfernen bzw. auf Larpcord umleiten. Es darf nichts mehr von Vencord- oder Vesktop-Servern geladen werden
- [x] Core wird mit der App ausgeliefert, also aktualisiert ein App-Update alles auf einmal
- [x] Prüfen beim Start und alle 4 Stunden
- [x] Update im Hintergrund laden, dann Hinweis im Discord-Style: Version, Changelog (aus den Release-Notes), Buttons „Jetzt neu starten“ und „Später“
- [x] Bei „Später“ automatisch beim nächsten Beenden installieren
- [x] Einstellungen im Hub: Auto-Update an/aus, Kanal „Stabil“ / „Beta“ (Beta = GitHub-Prereleases), Button „Jetzt nach Updates suchen“, aktuelle Version anzeigen
- [x] Fehler (kein Internet, Rate-Limit, kaputter Download) still loggen, nie den Client blockieren
- [x] GitHub Action anpassen: bei Tag `v*` bauen und mit `latest.yml` veröffentlichen (`--publish always`, `GH_TOKEN`), Tags mit `-beta` als Prerelease
- [x] In README dokumentieren: ohne Code-Signing zeigt Windows SmartScreen eine Warnung, Updates funktionieren trotzdem
- [x] Test: Version `0.0.1` installieren, `0.0.2` releasen → Update wird erkannt, geladen und installiert

**Fertig, wenn:** Der Testlauf oben vollständig klappt.

---

## 3. Neuer Installer im Discord-Style

Wichtig: Muss mit `electron-updater` kompatibel bleiben, also NSIS-Target behalten (kein Squirrel).

- [x] NSIS `oneClick` mit Installation pro Benutzer: keine altmodischen Wizard-Seiten, nur kurzer Fortschritt
- [x] Eigene Icons für Installer, Uninstaller und Header, dunkles Farbschema
- [x] Optional geprüft: randloses Splash-Fenster während der Installation → nach „Offen / Später“ verschoben (siehe unten)
- [x] Nach der Installation startet Larpcord direkt in einen modernen Splash-Screen („Larpcord wird eingerichtet…“) im Discord-Look: dunkler Hintergrund, abgerundete Ecken, animiertes Larpcord-Logo, Fortschrittstext
- [x] Onboarding beim ersten Start (eigenes Fenster, Discord-Style, 3 bis 4 Schritte): Willkommen, Hinweis „Alles nur lokal sichtbar“ plus Nutzungsbedingungen-Hinweis, Start-Preset wählen, Wasserzeichen an/aus
- [x] Uninstaller fragt: „Einstellungen und Presets behalten?“
- [x] Installer-Texte auf Deutsch und Englisch (NSIS-Mehrsprachigkeit, nach Systemsprache)
- [x] Eigenes Larpcord-Logo verwenden, **kein** Discord-Logo und kein Discord-Schriftzug. Discord-ähnliche Farben und Formen sind okay

**Fertig, wenn:** Installation fühlt sich an wie bei Discord: klicken, kurzer Fortschritt, direkt schöner Splash und Onboarding.

---

## 4. Aktivitäten: Fake-Aktivität & Aktivitäts-Changer (neues Plugin `larpActivity`)

**Harte Regel:** Nur lokale Anzeige. Keine Presence-Updates über das Gateway, keine Rich-Presence-Anmeldung. Anders als Vencords CustomRPC darf diese Aktivität für andere nicht sichtbar sein. Umsetzung durch Patchen der Aktivitäten, die der Client für die eigene User-ID anzeigt.

- [x] Eigene Aktivitäten erstellen, mehrere gleichzeitig möglich
- [x] Typ: Spielt, Hört, Schaut, Streamt, Tritt an, Benutzerdefinierter Status
- [x] Alle Felder bearbeitbar: Name, Details, Status-Zeile, großes Bild, kleines Bild, Tooltip-Texte beider Bilder, Gruppengröße (z. B. 2 von 4), Buttons (nur Anzeige, ohne Aktion)
- [x] Bilder als URL oder hochgeladene Datei
- [x] Zeit: „seit X“ (Startzeit), „noch X“ (Endzeit), fester Wert oder live laufend. Bei „Hört“ Fortschrittsleiste wie bei Spotify
- [x] Benutzerdefinierter Status mit Emoji und Text
- [x] **Aktivitäts-Changer:** echte erkannte Aktivitäten (z. B. ein laufendes Spiel) lokal verändern: Icon, Texte, Zeit überschreiben oder ganz ausblenden. Regeln pro Anwendung speichern
- [x] Editor im Hub mit Live-Vorschau, wie die Aktivität im Profil und in der Mitgliederliste aussieht
- [x] Anzeige überall, wo die eigene Aktivität erscheint: Profil-Popout, Profil-Fenster, Mitgliederliste, DM-Liste, User-Panel
- [x] Aktivitäten sind Teil der Presets

---

## 5. Lokale Rollen (Erweiterung von `larpServers`)

**Harte Regel:** Fake-Rollen nie in Strukturen einfügen, aus denen Discord Berechtigungen berechnet. Nur Anzeige, sonst erscheinen Admin-Buttons, die serverseitig scheitern.

- [ ] Pro Server eigene Rollen anlegen: Name, Farbe, optional Farbverlauf, optional Rollen-Icon (URL oder Datei)
- [ ] Rollen lassen sich der eigenen Person zuweisen, Reihenfolge festlegbar
- [ ] Anzeige: Rollen-Pillen im eigenen Profil auf dem Server, Namensfarbe im Chat und in der Mitgliederliste nach höchster Larp-Rolle, Rollen-Icon neben dem Namen
- [ ] Vorlagen: „Owner“ (Rot), „Admin“, „Moderator“, „VIP“
- [ ] Optional (nur wenn stabil machbar): eigene Person in der Mitgliederliste in einer eigenen Gruppe oben anzeigen. Sonst in „Offen / Später“
- [ ] Teil der Presets

---

## 6. Server umgestalten (Erweiterung von `larpServers`)

- [ ] Pro Server lokal ändern: Name, Icon, Banner
- [ ] Icon und Banner als URL oder Datei, GIFs erlaubt
- [ ] Anzeige überall: Serverleiste inklusive Tooltip, Server-Header, Banner oben in der Kanalliste, Server-Einstellungsübersicht, Erwähnungen des Servers
- [ ] Umsetzung über die Funktionen, die Icon- und Banner-URLs erzeugen, sowie die Namensanzeige. Guild-Objekte im Store nicht dauerhaft verändern
- [ ] „Auf Original zurücksetzen“ pro Server
- [ ] Teil der Presets

---

## 7. Profil-Musik (neues Plugin `larpMusic`)

- [ ] Song als lokale Datei (mp3, ogg, wav, m4a) oder URL
- [ ] Dateien im App-Datenordner speichern (über IPC im Desktop-Teil), nicht im DataStore (Größe). Maximal 20 MB pro Datei
- [ ] Wiedergabe beim Öffnen des eigenen Profil-Popouts oder Profil-Fensters, stoppt beim Schließen
- [ ] Einstellungen: Lautstärke, Startzeitpunkt im Song, Schleife, Ein- und Ausblenden
- [ ] Kleiner Mini-Player im Profil (Titel, Pause, Stumm)
- [ ] Globaler Stumm-Schalter im Hub
- [ ] Keine Songs mitliefern, nur eigene Dateien der Nutzer
- [ ] Teil der Presets (Verweis auf die Datei, beim Export optional einbetten)

---

## 8. Abschluss

- [ ] Preset-Format auf `version: 2` anheben, Migration von v1 automatisch
- [ ] Beim Export mit eingebetteten Dateien (Bilder, Musik) Größenwarnung anzeigen
- [ ] Alle neuen Patches mit Fallback absichern, einen absichtlich kaputt machen und testen, dass der Client weiterläuft
- [ ] `pnpm i18n:check` läuft ohne Fehler
- [ ] `CLAUDE.md` aktualisieren: neue Plugins, neue harte Regeln (keine Presence-Updates, keine Rollen in Berechtigungen), Updater- und Installer-Aufbau
- [ ] `README.md` aktualisieren: neue Features, Updater, SmartScreen-Hinweis, Sprachen
- [ ] Version erhöhen, Changelog in `CHANGELOG.md`, Release-Tag setzen

---

## 9. Vom User nachträglich eingefügt
- [x] bitte baue larpcordlogo.png überall als offizieles Logo ein
- [ ] achte darauf das der Hintergrund immer mit den einstellungen (Thema, Übergänge, usw.) zusammen passt
- [x] Repository: https://github.com/aquaxs1/Larpcord
- [x] Der Token für die Updates liegt in `.env` (`GH_TOKEN`, nicht im Repo)

## Offen / Später

_(Hier landen Punkte, die nicht stabil umsetzbar waren, mit kurzer Begründung.)_

### Nicht umsetzbar ohne schreibende Requests / Server-Prüfung
- **Echte Nitro-Funktionen** (größere Uploads, HD-Streaming, Emojis/Sticker überall): prüft Discords Server. Larpcord setzt `premiumType` nur am *Anzeige*-Profil, nie am User-Objekt.
- **Server-Boost-Fortschrittsleiste** in der Kanalliste: Die Komponente synchronisiert Boost-Zähler in einen lokalen Store und öffnet Boost-Kauf-Modals. Ein Patch wäre mehr als reine Anzeige (Regel 3). Die Boost-Anzeige läuft stattdessen über Header-Gem und Guild-Infos.
- **Natives Server-Tag (`primaryGuild`) als Clan-Tag**: Discord lädt beim Anklicken Daten der Tag-Guild nach. Mit einem erfundenen Tag entstünden Requests für nicht existierende Server. Larpcord zeigt den Clan-Tag deshalb als eigene Dekoration an.

### Name-Änderer: bekannte Grenzen
- **Standardname beim Server-Erstellen** („<Name>s Server“) nutzt den Larp-Namen. Das Feld ist vor dem Absenden sichtbar und editierbar, deshalb nicht gepatcht.
- **Mitgliederliste** übernimmt einen geänderten Larp-Namen bei ausgeblendetem Server-Nick erst, wenn Discord die Liste neu aufbaut (z. B. Kanalwechsel). Chat, User-Panel, Profil und Erwähnungen aktualisieren sofort.
- **Discord-RPC-Nick** (Modul für Spiele/Overlays) wird aus Anzeigefunktionen berechnet. Im Desktop-Client läuft kein RPC-Server, der User selbst wird trotzdem mit echtem Namen serialisiert.

### larpLayout: spätere Bereiche
- Kanalliste: Kategorien und Kanäle eines Servers lokal umsortieren oder ausblenden.
- Mitgliederliste links statt rechts, Breite der Seitenleisten speichern.
- Titelleiste (Posteingang, Hilfe) und Chat-Eingabe-Buttons (Geschenk, GIF, Sticker, Emoji) umsortieren/ausblenden.
- Server innerhalb von Ordnern lokal umsortieren (bewusst weggelassen: Ordner werden nur als Ganzes verschoben, damit Discords Ordnerstruktur unangetastet bleibt).
- Umschalter, deren Label je nach Zustand wechselt und die Discord nicht als Paar übersetzt (z. B. Mitgliederliste ein/aus), rutschen nach dem Umschalten ans Ende der Reihenfolge.

### Installer: bewusst weggelassen
- **Animiertes Splash-Fenster während der NSIS-Installation** (`nsisSplash`/`newadvsplash`): bräuchte ein zusätzliches
  NSIS-Plugin im Build und läuft nur wenige Sekunden, während der oneClick-Installer ohnehin schon einen Fortschritt zeigt.
  Der Splash direkt nach der Installation („Larpcord wird eingerichtet …“) deckt den sichtbaren Teil ab.
- **Dunkles Farbschema im Deinstallations-Fenster:** MUI definiert `un.onGUIInit` selbst; nur der Installer wird eingefärbt.

### Offene Ideen
- Clan-Tag, Häkchen und Krone im Profil direkt neben dem Namen statt in der Badge-Zeile (braucht einen zusätzlichen Profil-Patch).
- Vorschau im Hub mit Discords echter Profil-Komponente statt eigener Karte.
