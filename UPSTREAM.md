# Upstream versions

Larpcord is based on two GPL-3.0 projects that are checked in as plain folders (no submodules).
Keep track of the upstream commits here for future updates.

| Folder | Upstream | Commit | Date |
|---|---|---|---|
| `core/` | https://github.com/Vendicated/Vencord | `59a54286542651fff5ea53f0ce6cadf2a6aa7521` | 2026-09-15 |
| `desktop/` | https://github.com/Vencord/Vesktop | `303e8c03ce7a65cf3dcccbb9f298119aa085711d` | 2026-09-13 |

## Pulling in an upstream update

1. Clone the upstream repo into a temporary folder.
2. Export `git diff <old-hash> <new-hash>` in the upstream repo as a patch.
3. Apply the patch in the matching folder with `git apply --3way` and resolve conflicts.
4. Update the hash in this table.
