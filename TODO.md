# TODO / bewusst weggelassen

Punkte, die Larpcord absichtlich (noch) nicht umsetzt. Siehe Regeln in `CLAUDE.md`.

## Nicht umsetzbar ohne schreibende Requests / Server-Prüfung
- **Echte Nitro-Funktionen** (größere Uploads, HD-Streaming, Emojis/Sticker überall): prüft Discords Server. Larpcord setzt `premiumType` nur am *Anzeige*-Profil, nie am User-Objekt.
- **Server-Boost-Fortschrittsleiste** in der Kanalliste: Die Komponente synchronisiert Boost-Zähler in einen lokalen Store und öffnet Boost-Kauf-Modals. Ein Patch wäre mehr als reine Anzeige (Regel 3). Die Boost-Anzeige läuft stattdessen über Header-Gem und Guild-Infos.
- **Natives Server-Tag (`primaryGuild`) als Clan-Tag**: Discord lädt beim Anklicken Daten der Tag-Guild nach. Mit einem erfundenen Tag entstünden Requests für nicht existierende Server. Larpcord zeigt den Clan-Tag deshalb als eigene Dekoration an.

## Name-Änderer: bekannte Grenzen
- **Standardname beim Server-Erstellen** („<Name>s Server“) nutzt den Larp-Namen. Das Feld ist vor dem Absenden sichtbar und editierbar, deshalb nicht gepatcht.
- **Mitgliederliste** übernimmt einen geänderten Larp-Namen bei ausgeblendetem Server-Nick erst, wenn Discord die Liste neu aufbaut (z. B. Kanalwechsel). Chat, User-Panel, Profil und Erwähnungen aktualisieren sofort.
- **Discord-RPC-Nick** (Modul für Spiele/Overlays) wird aus Anzeigefunktionen berechnet. Im Desktop-Client läuft kein RPC-Server, der User selbst wird trotzdem mit echtem Namen serialisiert.

## larpLayout: spätere Bereiche
- Kanalliste: Kategorien und Kanäle eines Servers lokal umsortieren oder ausblenden.
- Mitgliederliste links statt rechts, Breite der Seitenleisten speichern.
- Titelleiste (Posteingang, Hilfe) und Chat-Eingabe-Buttons (Geschenk, GIF, Sticker, Emoji) umsortieren/ausblenden.
- Server innerhalb von Ordnern lokal umsortieren (bewusst weggelassen: Ordner werden nur als Ganzes verschoben, damit Discords Ordnerstruktur unangetastet bleibt).
- Umschalter, deren Label je nach Zustand wechselt und die Discord nicht als Paar übersetzt (z. B. Mitgliederliste ein/aus), rutschen nach dem Umschalten ans Ende der Reihenfolge.

## Offene Ideen
- Clan-Tag, Häkchen und Krone im Profil direkt neben dem Namen statt in der Badge-Zeile (braucht einen zusätzlichen Profil-Patch).
- Vorschau im Hub mit Discords echter Profil-Komponente statt eigener Karte.
