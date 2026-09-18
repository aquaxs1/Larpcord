# Upstream-Stände

Larpcord basiert auf zwei GPL-3.0-Projekten, die als normale Ordner (ohne Submodule) eingecheckt sind.
Für spätere Updates die jeweiligen Upstream-Commits hier nachhalten.

| Ordner | Upstream | Commit | Datum |
|---|---|---|---|
| `core/` | https://github.com/Vendicated/Vencord | `59a54286542651fff5ea53f0ce6cadf2a6aa7521` | 2026-09-15 |
| `desktop/` | https://github.com/Vencord/Vesktop | `303e8c03ce7a65cf3dcccbb9f298119aa085711d` | 2026-09-13 |

## Upstream-Update einspielen

1. Upstream-Repo in einen temporären Ordner klonen.
2. `git diff <alter-hash> <neuer-hash>` im Upstream-Repo als Patch exportieren.
3. Patch im jeweiligen Ordner mit `git apply --3way` anwenden, Konflikte lösen.
4. Hash in dieser Tabelle aktualisieren.
