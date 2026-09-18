# 🎭 Larpcord

**Der Discord-Client, in dem du alles sein darfst. Zumindest auf deinem eigenen Bildschirm.**

Larpcord ist ein quelloffener, eigenständiger Discord-Client (eigene `.exe`), mit dem du dir lokal Badges, Nitro-Optik, Avatar-Dekorationen, Profileffekte und Server-Badges gibst. Alles, was Larpcord verändert, ist **nur auf deinem PC sichtbar**. Niemand sonst sieht es, und dein Account wird nicht verändert.

> Larp (Live Action Role Play): so tun als ob. Genau das macht Larpcord.

---

## ✨ Features

### 🏅 Badges & Profil
- Alle offiziellen Badges lokal: Discord Staff, Partner, HypeSquad (Events, Bravery, Brilliance, Balance), Early Supporter, Bug Hunter (Stufe 1 & 2), Active Developer, Moderator Alumni, Early Verified Bot Developer
- Eigene Badges mit eigenem Bild (PNG/GIF/SVG) und Tooltip-Text
- „Mitglied seit“-Datum frei wählbar
- Eigener Clan-Tag neben deinem Namen

### 💎 Nitro-Look
- Nitro-Badge mit frei wählbarer Abo-Dauer (inkl. Boost-Badge-Stufen)
- Profil-Themes mit Farbverlauf, eigenes Banner, animierter Avatar (lokales GIF)
- Alle Avatar-Dekorationen, Profileffekte und Nameplates aus dem Shop lokal auswählbar
- Display-Name-Styles: Schriftarten, Farbverläufe, Glow

### 🏰 Server-Badges
- Partner- oder Verified-Abzeichen für beliebige Server
- Boost-Level (1 bis 3) und Boost-Anzahl frei einstellbar
- Einstellbar pro Server

### 🎭 Larp-Extras & Presets
- Verified-Häkchen und Server-Owner-Krone neben deinem Namen
- **Larp-Presets**: komplette Setups speichern und per Klick wechseln, z. B. „Discord Staff“, „Nitro-Gönner“, „OG 2015“
- Import/Export aller Einstellungen als `.larp.json`, zum Teilen mit Freunden
- Optionales „Larpcord“-Wasserzeichen im Profil (standardmäßig aus)

### 🎨 UI & Themes
- Theme-Editor mit Live-Vorschau (Farben, Schriftarten, Rundungen)
- Eigene Sounds, eigener Ladebildschirm, eigenes App-Icon

### ⚙️ Larpcord-Hub
Alle Einstellungen an einem Ort, mit Live-Vorschau deines Profils: **Einstellungen → Larpcord → Larpcord Hub**.
Ladebildschirm, Tray- und App-Icon findest du unter **Einstellungen → Larpcord → Larpcord Desktop → Customize App Assets**.

---

## ❗ Was Larpcord nicht kann

Larpcord ist **rein kosmetisch und lokal**. Alles, was Discords Server prüft, bleibt so, wie es ist:

- Keine größeren Uploads, kein echtes HD-Streaming, keine echten Server-Boosts
- Andere Nutzer sehen deine Larp-Badges und -Dekorationen **nicht**
- Dein Account, deine Server und deine Rollen werden nicht verändert

---

## 🚀 Installation

1. Neuestes Release unter [Releases](../../releases) herunterladen
2. `Larpcord-Setup.exe` ausführen
3. Mit deinem Discord-Account einloggen
4. Einstellungen → **Larpcord** öffnen und loslegen

### Selbst bauen

Voraussetzungen: [Node.js](https://nodejs.org) 22+, [pnpm](https://pnpm.io) 11+, Git

```bash
git clone https://github.com/DEIN-NAME/larpcord.git
cd larpcord
pnpm install      # installiert core/ und desktop/
pnpm build        # baut Core und Desktop
pnpm package      # erzeugt desktop/dist/Larpcord-Setup.exe
```

Weitere Befehle:

| Befehl | Zweck |
|---|---|
| `pnpm dev` | Dev-Build bauen und Larpcord direkt aus dem Quellcode starten |
| `pnpm icons` | Platzhalter-Icons neu erzeugen (braucht Python + Pillow) |

Ein Release entsteht automatisch, sobald ein Tag `v*` gepusht wird (siehe `.github/workflows/release.yml`).

---

## 🧱 Aufbau

Larpcord steht auf den Schultern von zwei großartigen Open-Source-Projekten:

| Ordner | Basis | Aufgabe |
|---|---|---|
| `core/` | [Vencord](https://github.com/Vendicated/Vencord) | Client-Mod mit allen Larpcord-Plugins |
| `desktop/` | [Vesktop](https://github.com/Vencord/Vesktop) | Eigenständige Desktop-App (`.exe`) |

Die Larpcord-Plugins liegen in `core/src/plugins/larp*/`.

---

## ⚠️ Hinweis zu Discords Nutzungsbedingungen

Modifizierte Discord-Clients verstoßen gegen die [Nutzungsbedingungen von Discord](https://discord.com/terms). Sperren wegen rein kosmetischer Mods sind selten, aber möglich. **Die Nutzung erfolgt auf eigenes Risiko.**

Larpcord sendet keine automatisierten Anfragen an Discord und verändert nichts an deinem Account.

**Bitte nutze Larpcord nicht, um andere zu täuschen**, etwa mit Screenshots von Fake-Staff-Badges. Dafür gibt es das optionale Wasserzeichen.

---

## 🤝 Mitmachen

Pull Requests sind willkommen! Neue Badges, Themes oder Presets? Einfach ein Issue aufmachen.

## 📄 Lizenz

GPL-3.0, wie Vencord und Vesktop, auf denen Larpcord basiert.
Larpcord ist nicht mit Discord Inc. verbunden.
