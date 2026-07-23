# Version Management

How AssistX is versioned, released, and updated.

## Canonical repository

- GitHub: `Aayush-Duhan/assistx` — the single source of truth for releases.
- Must match `publish.owner` / `publish.repo` in `electron-builder.json5` and `GITHUB_REPO` in `src/lib/constants.ts`.

## How updates work

- `package.json` `version` is the only authored version. `app.getVersion()` feeds the UI (shared state `appVersion`; Settings → General via `get-version-info`).
- `electron-updater` checks the GitHub Releases feed of the canonical repo:
  - packaged builds only — dev mode is skipped unless `TEST_AUTO_UPDATE=true`
  - on startup and every hour
  - `autoDownload: true`, `autoInstallOnAppQuit: true`
- Update status is **main-owned operational state** in `electron/features/autoUpdater.ts` — deliberately **not** part of `SharedState` (progress ticks would thrash every window, and `resetState` should not have to preserve it). The renderer reads it via `get-update-status` (invoke) and `update-status-changed` (broadcast), and installs via `install-update`.
- CI: `.github/workflows/release.yml` builds and publishes a Windows NSIS installer, blockmap, and `latest.yml` to a GitHub Release on every `v*` tag push. Windows-only by design today.

## Operator checklist (shipping a release)

1. Working tree clean, `pnpm validate` passing.
2. Bump + tag in one step:

   ```bash
   pnpm release:tag patch   # or minor / major; omit the argument if you already ran pnpm version:patch
   ```

   - appends commit messages since the last tag to `CHANGELOG.md` (newest entry on top)
   - creates a `chore: release vX.Y.Z` commit and an annotated `vX.Y.Z` tag
3. Push:

   ```bash
   git push origin main && git push origin vX.Y.Z
   ```
4. Watch the Release workflow in GitHub Actions.
5. Verify the GitHub Release assets: NSIS `.exe`, blockmap, and **`latest.yml`** — electron-updater needs `latest.yml` to discover the update.
6. Smoke test: an older installed build should discover the new version, download it, and show “Restart to update” in the fallback menu and Settings → General.

## Code signing / SmartScreen

- The app is currently **unsigned**. Windows SmartScreen will warn on install and on update.
- Before wider distribution: obtain an OV/EV code-signing certificate, configure signing in `electron-builder.json5` (`win.certificateFile` / `certificateSubjectName`, or Azure Key Vault), and add the secrets to CI.
- Until then this is a documented release prerequisite, not an implementation blocker.

## Version scripts

| Script | Effect |
|---|---|
| `pnpm version:patch` / `version:minor` / `version:major` | bump `package.json` without a git tag |
| `pnpm release:tag [patch\|minor\|major]` | CHANGELOG entry + release commit + annotated tag |
