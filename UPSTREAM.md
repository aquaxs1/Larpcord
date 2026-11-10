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

## Local changes to upstream files

Keep these when merging upstream updates:

- `core/src/plugins/crashHandler/index.ts`: always logs the crash error and component stack, shows the error in
  the crash notification and copies the details when it is clicked.
- `core/src/webpack/common/modals.ts`: taken from upstream Vencord `main` (2026-10-05) – `Modal` and `ConfirmModal`
  are found by code because Discord no longer exports them by name.
- `core/src/webpack/webpack.ts`, `core/src/webpack/patchWebpack.ts`, `core/src/webpack/common/menu.ts`,
  `core/src/debug/loadLazyChunks.ts`, `core/src/debug/runReporter.ts`, `core/src/plugins/_api/notices.ts` and
  `core/packages/discord-types/webpack/index.d.ts`: taken from upstream Vencord `main` (2026-11-10) for Discord's
  switch to rspack (exports passed as plain values, no `loaded` flag on modules, numeric chunk ids).
- `core/src/webpack/common/utils.ts`: `Toasts`/`showToast` translate to Discord's new toast store, and
  `SettingsRouter`, `ChannelRouter` and `UserProfileActions` are found by code. Upstream changed these APIs instead;
  Larpcord keeps the old ones so its plugins and the other bundled plugins keep working.
- `desktop/packages/libvesktop/package.json`: explicit no-op `install` script. Without it pnpm runs `node-gyp rebuild`
  on every install (because of `binding.gyp`), which fails on Windows runners whose Visual Studio node-gyp doesn't
  know. The module is Linux-only and the build uses the prebuilt binaries; `pnpm buildLibVesktop` still compiles it.
