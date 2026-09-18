# TODO / bewusst weggelassen

Punkte, die Larpcord absichtlich (noch) nicht umsetzt. Siehe Regeln in `CLAUDE.md`.

## Nicht umsetzbar ohne schreibende Requests / Server-Prüfung
- **Echte Nitro-Funktionen** (größere Uploads, HD-Streaming, Emojis/Sticker überall): prüft Discords Server. Larpcord setzt `premiumType` nur am *Anzeige*-Profil, nie am User-Objekt.
- **Server-Boost-Fortschrittsleiste** in der Kanalliste: Die Komponente synchronisiert Boost-Zähler in einen lokalen Store und öffnet Boost-Kauf-Modals. Ein Patch wäre mehr als reine Anzeige (Regel 3). Die Boost-Anzeige läuft stattdessen über Header-Gem und Guild-Infos.
- **Natives Server-Tag (`primaryGuild`) als Clan-Tag**: Discord lädt beim Anklicken Daten der Tag-Guild nach. Mit einem erfundenen Tag entstünden Requests für nicht existierende Server. Larpcord zeigt den Clan-Tag deshalb als eigene Dekoration an.

## Offene Ideen
- Clan-Tag, Häkchen und Krone im Profil direkt neben dem Namen statt in der Badge-Zeile (braucht einen zusätzlichen Profil-Patch).
- Vorschau im Hub mit Discords echter Profil-Komponente statt eigener Karte.
