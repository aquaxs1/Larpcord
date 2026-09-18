# Larpcord – Bauplan für Claude Code

Du baust **Larpcord**: einen eigenständigen Discord-Client (eigene .exe), mit dem Nutzer sich lokal Badges, Nitro-Optik, Dekorationen und Server-Badges geben können. Lies zuerst `README.md` für die Feature-Übersicht.

**Grundprinzip: So wenig wie möglich selbst bauen.** Die Basis steht schon: Vesktop (Desktop-App) + Vencord (Client-Mod). Wir forken beide, brandnen sie um und schreiben nur die Larp-Plugins selbst.

---

## Harte Regeln (niemals brechen)

1. **Nur lokal.** Alle Änderungen passieren im Renderer bzw. in den lokalen Stores. Keine schreibenden Requests an die Discord-API (kein PATCH/POST auf `/users/@me`, `/guilds/...` usw.).
2. **Nur der eigene User.** Profil-Overrides gelten ausschließlich für `UserStore.getCurrentUser().id`. Fremde Profile nie verändern.
3. **Server-Badges nur Anzeige.** Keine Guild-Features setzen, die Funktionen freischalten oder Requests auslösen könnten. Nur Anzeige-Elemente (Header-Icon, Boost-Leiste, Tooltip).
4. **Kein Selfbot-Verhalten.** Keine automatisierten Nachrichten, Reaktionen, Joins o. Ä.
5. **Lizenz.** Vencord und Vesktop sind GPL-3.0. Copyright-Hinweise behalten, Larpcord bleibt GPL-3.0.
6. **Robust statt clever.** Jeder Patch braucht einen Fallback: Wenn ein `find` nicht mehr matcht, darf nichts crashen (Vencord-Patches sauber mit `predicate`/`noWarn` absichern, Fehler loggen, Feature deaktivieren).

---

## Repo-Struktur (Ziel)

```
larpcord/
├── README.md
├── CLAUDE.md                 ← diese Datei
├── package.json              ← Root-Skripte: build, package, dev
├── core/                     ← Fork von Vencord
│   └── src/plugins/
│       ├── larpCore/         ← Store, Settings-Hub, Presets, Import/Export, Wasserzeichen
│       ├── larpBadges/
│       ├── larpNitro/
│       ├── larpDecorations/
│       ├── larpName/
│       ├── larpServers/
│       └── larpThemes/
└── desktop/                  ← Fork von Vesktop
```

`core/` und `desktop/` als normale Ordner einchecken (kein Submodule), damit das Repo einfach bleibt. Upstream-Commit-Hashes in `UPSTREAM.md` notieren, um später Updates reinzumergen.

---

## Phase 0 – Basis aufsetzen

1. Vencord nach `core/` und Vesktop nach `desktop/` klonen, jeweils `.git` entfernen, Upstream-Hashes in `UPSTREAM.md` festhalten.
2. Root-`package.json` mit Skripten:
   - `build` → `core` bauen, danach Build-Artefakte in `desktop` kopieren
   - `dev` → Desktop im Dev-Modus mit lokalem Core starten
   - `package` → `.exe`-Installer mit electron-builder erzeugen
3. **Vesktop auf lokalen Core umstellen:** Vesktop lädt Vencord standardmäßig aus GitHub-Releases herunter. Finde die Stelle (in `desktop/src/main/` nach der Download-URL bzw. `vencordDesktop` greppen) und ändere sie so, dass der mitgelieferte Larpcord-Core aus den App-Ressourcen geladen wird. Kein Download von fremden Servern, kein Auto-Update aus Vencord-Releases.
4. **Rebranding Desktop:** App-Name „Larpcord“, `appId` z. B. `dev.larpcord.app`, Fenstertitel, Tray, Installer-Name `Larpcord-Setup.exe`, Platzhalter-Icon (`desktop/build/icon.png`, einfach generiert).
5. **Rebranding Core:** Sichtbare Namen im Settings-Bereich „Larpcord“ nennen. Interne Bezeichner (`Vencord.*`) **nicht** umbenennen, das macht Upstream-Merges kaputt.

**Fertig, wenn:** `pnpm build && pnpm package` eine .exe erzeugt, die startet, Login funktioniert und in den Einstellungen ein Bereich „Larpcord“ sichtbar ist.

---

## Phase 1 – larpCore (Fundament)

Alle anderen Plugins hängen davon ab. Bevor du schreibst: Vencords Plugin-Aufbau (`definePlugin`, `definePluginSettings`, `patches`) und bestehende Plugins mit Settings-UI ansehen.

**Zentraler Store** (`larpCore/store.ts`), persistiert über Vencords DataStore:

```ts
interface LarpProfile {
  badges: { builtin: string[]; custom: CustomBadge[] };
  memberSince?: string;          // ISO-Datum
  clanTag?: { tag: string; iconUrl?: string };
  nitro: { enabled: boolean; since?: string; boostSince?: string };
  profile: { themeColors?: [string, string]; bannerUrl?: string; animatedAvatarUrl?: string };
  decoration?: { asset: string; skuId?: string };
  profileEffect?: string;
  nameplate?: string;
  nameStyle?: { font?: string; gradient?: [string, string]; glow?: boolean };
  extras: { verifiedCheck: boolean; ownerCrown: boolean };
  servers: Record<string, ServerLarp>; // guildId → Einstellungen
  watermark: boolean;            // Standard: false
}
interface CustomBadge { id: string; imageUrl: string; tooltip: string }
interface ServerLarp { partner?: boolean; verified?: boolean; boostLevel?: 0|1|2|3; boostCount?: number }
interface LarpPreset { name: string; profile: LarpProfile }
```

- Store bietet `get()`, `update(partial)`, `subscribe(fn)`, damit andere Plugins bei Änderungen neu rendern.
- **Presets:** speichern, laden, löschen, umbenennen. Drei mitgelieferte Presets: „Discord Staff“, „Nitro-Gönner“, „OG 2015“.
- **Import/Export:** Datei `*.larp.json` mit `{ version: 1, presets: LarpPreset[] }`. Beim Import validieren (Schema prüfen, unbekannte Felder verwerfen, Bild-URLs nur `https:` oder `data:image/`).
- **Larpcord-Hub:** eigener Tab in den Einstellungen mit Unter-Tabs (Badges, Nitro, Dekorationen, Name, Server, Themes, Presets) und Live-Vorschau des eigenen Profils rechts.
- **Wasserzeichen:** kleiner Text „🎭 Larpcord“ im eigenen Profil-Popout, per Toggle, standardmäßig aus.

**Fertig, wenn:** Hub öffnet sich, Einstellungen überleben einen Neustart, Presets wechseln und Export/Import funktionieren.

---

## Phase 2 – larpBadges

- Vencords Badge-API nutzen (`@api/Badges`, `addProfileBadge`), Badges nur für die eigene User-ID zurückgeben.
- Offizielle Badges: Icons aus Discords eigenen Assets referenzieren (die Badge-Icons liegen im Client, im Code suchen, wie Discord sie rendert). Keine Icons ins Repo kopieren.
- Custom Badges mit Bild + Tooltip, Reihenfolge per Drag & Drop.
- „Mitglied seit“: Anzeige im Profil patchen (nur für eigenen User).

## Phase 3 – larpNitro & larpDecorations

- **Orientierung:** Vencords vorhandene Plugins für Profil-Themes und Dekorationen ansehen und deren Patch-Stellen als Vorlage nutzen.
- Nitro: Nitro-Badge mit Datum, Boost-Badge-Stufe aus `boostSince` berechnet.
- Profil: Theme-Farben, Banner, animierter Avatar → eigene Profildaten lokal überschreiben (Profil-Store bzw. Render-Stelle patchen, nur eigener User).
- Dekorationen, Profileffekte, Nameplates: Liste der verfügbaren Items aus Discords Collectibles-Store lesen (falls schon geladen) und in einer Auswahl-UI mit Vorschau anzeigen. Gewähltes Item nur lokal im eigenen User-Objekt setzen.
- **Nicht** versuchen, Nitro-Funktionen freizuschalten, die der Server prüft (Upload-Limits, Streaming-Qualität). Wo Discord bei Nitro-Flag zusätzliche UI anzeigt, die dann serverseitig scheitert, diese UI nicht aktivieren.

## Phase 4 – larpName

- Clan-Tag, Verified-Häkchen, Owner-Krone neben dem eigenen Namen (Chat, Mitgliederliste, Profil).
- Name-Styles: Schriftart, Farbverlauf, Glow per CSS am eigenen Namen.

## Phase 5 – larpServers

- Im Hub: Serverliste (aus `GuildStore`) mit Einstellungen pro Server.
- Anzeige: Partner-/Verified-Icon im Server-Header und in der Tooltip-Anzeige der Serverleiste, Boost-Level und -Anzahl in der Boost-Anzeige.
- Nur Anzeige patchen, siehe Regel 3. Nicht die `features` der Guild global verändern.

## Phase 6 – larpThemes

- Theme-Editor: Farben, Schriftart, Eckenradius mit Live-Vorschau. Ergebnis wird als CSS über Vencords Theme-/QuickCSS-Mechanismus angewendet.
- Themes als Teil von Presets speicherbar.
- Eigene Sounds (Benachrichtigung, Anruf) durch lokale Dateien ersetzen.
- Eigener Ladebildschirm und App-Icon: im `desktop/`-Teil (Vesktop hat bereits Splash-Einstellungen, diese erweitern).

---

## Phase 7 – Feinschliff & Release

- Alle Larp-Plugins standardmäßig aktiv, in Vencords Plugin-Liste unter Kategorie „Larpcord“.
- Fehlerfall testen: Einen Patch absichtlich kaputt machen → Client muss weiterlaufen.
- GitHub-Actions-Workflow: bei Tag `v*` automatisch `.exe` bauen und als Release hochladen.
- README-Screenshots ergänzen.

---

## Arbeitsweise

- **Phase für Phase.** Nach jeder Phase bauen, starten, testen und kurz zusammenfassen, was geht und was nicht.
- **Patches finden:** Im laufenden Client mit Vencords Dev-Tools (Webpack-Suche) nach eindeutigen Strings suchen, die sich selten ändern. Lieber stabile Strings als minifizierte Variablennamen.
- **Bei Unsicherheit** über Discord-Interna: bestehende Vencord-Plugins als Referenz nutzen, statt zu raten.
- **Commits:** klein und beschreibend, ein Commit pro Feature.
- **Nichts erfinden:** Wenn eine Funktion technisch nur mit schreibenden API-Requests ginge, weglassen und in `TODO.md` notieren.
