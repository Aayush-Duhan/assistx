# Plan: Complete Electron Version Management

## Goal

Finish AssistX version management against [electron-version-management-guide.md](electron-version-management-guide.md): reliable versioning, auto-updates via GitHub Releases, clear UX, and a repeatable release path — without overbuilding analytics/rollback for a `0.0.1` app.

---

## Progress audit

### Already done (foundation)

| Area | Status | Evidence |
|------|--------|----------|
| `electron-updater` dependency | Done | `package.json` `electron-updater@^6.7.3` |
| Main-process updater | Partial | [`electron/features/autoUpdater.ts`](electron/features/autoUpdater.ts) — logger, auto-download, hourly check when packaged |
| Publish target | Done | [`electron-builder.json5`](electron-builder.json5) → GitHub `Aayush-Duhan/assistx` |
| Release CI | Done | [`.github/workflows/release.yml`](.github/workflows/release.yml) builds/publishes Windows on `v*` tags |
| Shared update state | Present but **to remove** | [`shared/sharedState.ts`](shared/sharedState.ts) `autoUpdateState` — only used by FallbackMenu + autoUpdater |
| Minimal install UI | Partial | [`src/components/fallback-menu.tsx`](src/components/fallback-menu.tsx) “Restart to Update” via shared state |
| App version in shared state | **Keep** | `appVersion: app.getVersion()` — stable identity |
| Tag / version | Done | `package.json` `0.0.1`, git tag `v0.0.1` |

### Incomplete or broken (must fix)

1. **Version is not single-sourced**
   - `package.json` → `0.0.1`
   - [`shared/constants.ts`](shared/constants.ts) `APP_VERSION = "1.0.0"` (hardcoded)
   - [`electron/utils/constants.ts`](electron/utils/constants.ts) `PACKAGE_INFO.version` / `RENDERER_VERSION` also hardcoded
2. **No version tooling scripts** — guide’s `version:patch|minor|major` / release helpers missing
3. **IPC incomplete**
   - `check-for-update` / `install-update` fire-and-forget handlers exist
   - Schema defines invoke `check-for-updates` but **no main handler is registered**
   - Missing: `get-version-info`, `get-update-status` (as invoke), progress/error exposure
4. **`checkForUpdates()` result logic is wrong** — treats any `updateInfo.version` as available (even current)
5. **Force-update / recommended thresholds are stubs** — `configData` hardcodes `0.0.0` (never forces)
6. **Quit-for-update path incomplete** — `isQuittingForUpdateInstall()` exists but is still a TODO in [`baseWindow.ts`](electron/windows/baseWindow.ts) close handler
7. **No real About / General update UX** — [`generalPage.tsx`](src/apps/dashboard/pages/main/generalPage.tsx) is a stub
8. **No download progress / manual check UI**
9. **Dead dual path** — [`src/hooks/useAppUpdates.ts`](src/hooks/useAppUpdates.ts) does client-side GitHub API polling with wrong repo (`assistx-ai/assistx` vs builder’s `Aayush-Duhan/assistx`); unused and conflicts with `electron-updater`
10. **No CHANGELOG**, no local release script, no tests for updater logic
11. **`autoUpdateState` in shared state is the wrong home** — see architecture decision below

### Guide coverage matrix

| Guide section | This pass | Notes |
|---------------|-----------|-------|
| SemVer + package.json as source of truth | **Yes** | Unify hardcoded versions |
| Version scripts / tooling | **Yes** | Lightweight scripts + tag helper |
| `electron-updater` main setup | **Yes** | Fix + complete existing module |
| GitHub Releases publish | **Done** | Keep Windows CI; document |
| About / version UI | **Yes** | General page |
| Update dialog / progress / manual check | **Yes** | General page + menu install |
| Update strategies (skip/defer/prefs store) | **Later** | Defaults only this pass |
| Smart updater class / electron-store prefs | **Later** | Not needed for v0.0.x |
| Rollback / version history backups | **Later** | High cost, low urgency |
| Data migration framework | **Later** | Existing SQLite/drizzle path separate |
| Full ReleaseManager class | **Partial** | Small script, not a framework |
| Update analytics / telemetry | **Out** | Explicitly skip |
| Code signing verification | **Document only** | Needs certs |

### Intentionally out of scope

- Full rollback + multi-version data backup (`VersionManager`)
- Anonymous update analytics
- Code signing implementation (document as release prerequisite)
- macOS/Linux publish in CI (Windows-only by design today)
- Skip/defer user preferences

---

## Architecture decision: shared update state?

### Decision: **remove `autoUpdateState` from shared state**

Shared state is **not required** for updates. Keeping it creates dual plumbing once progress/manual check exist.

#### Current consumers (exhaustive)

| Location | Use |
|----------|-----|
| [`electron/features/autoUpdater.ts`](electron/features/autoUpdater.ts) | Main writes status; gates `installUpdate()` |
| [`src/components/fallback-menu.tsx`](src/components/fallback-menu.tsx) | Only renderer reader — “Restart to Update” |
| [`stateManager.resetState`](electron/utils/shared/stateManager.ts) | Special-cases **preserving** `autoUpdateState` on reset (smell) |
| Tests / schema | Mirror only |

#### Why remove

1. **Wrong ownership** — Shared state is collaborative UI/app state (theme, keybindings, window flags). Update status is **main-owned operational state** (like `get-server-config`).
2. **`resetState` already treats it as foreign** — preserves update status while wiping user fields.
3. **Progress cannot live in shared state** — `updateSharedState` broadcasts the full `SharedState` to every window; percent ticks would thrash all UIs.
4. **Migration cost is low now** — only FallbackMenu reads it; swap while building General page.
5. **Matches the guide** — dedicated IPC, not a global bag.

#### Keep vs remove

| Field | Decision | Why |
|-------|----------|-----|
| `appVersion` | **Keep in shared state** | Stable identity; changes only on relaunch; menus already use it |
| `autoUpdateState` | **Remove** | Updater lifecycle → dedicated module + IPC |

---

## Target design

### Update status (main-owned)

Lives in [`electron/features/autoUpdater.ts`](electron/features/autoUpdater.ts) (or extracted `updateStatus` helper). Shared Zod type in `shared/` so IPC stays typed.

```ts
// shared/updateStatus.ts (new)
export const updateStatusSchema = z.union([
  z.object({ state: z.literal("idle") }),
  z.object({ state: z.literal("checking") }),
  z.object({
    state: z.literal("available"),
    version: z.string(),
    isBelowWarningThreshold: z.boolean(),
  }),
  z.object({
    state: z.literal("downloading"),
    version: z.string(),
    percent: z.number(),
    transferred: z.number(),
    total: z.number(),
  }),
  z.object({
    state: z.literal("downloaded"),
    version: z.string(),
    isBelowWarningThreshold: z.boolean(),
  }),
  z.object({
    state: z.literal("error"),
    message: z.string(),
    // optional: last known version if download failed mid-way
    version: z.string().optional(),
  }),
]);

export type UpdateStatus = z.infer<typeof updateStatusSchema>;
```

**State machine (happy path):**

```text
idle → checking → available → downloading → downloaded → (install / relaunch)
                 ↘ idle (no update)
                 ↘ error
```

Notes:
- With `autoDownload = true`, `available` may be brief (or skipped in UI) before `downloading`.
- After successful install, next launch starts at `idle`.
- `checking` is useful for General-page spinner; FallbackMenu only cares about `downloaded`.

### IPC contract

| Direction | Channel | Kind | Purpose |
|-----------|---------|------|---------|
| R → M | `get-update-status` | **invoke** | Hydrate on mount |
| R → M | `check-for-updates` | **invoke** | Manual check; returns `"none" \| "available" \| "failed"` (or richer result) |
| R → M | `install-update` | **on** (keep) | Quit & install when `downloaded` |
| R → M | `get-version-info` | **invoke** | About panel details |
| M → R | `update-status-changed` | **broadcast** | Full `UpdateStatus` snapshot |

**Cleanup:**
- Remove fire-and-forget `check-for-update` if nothing needs it after migration (prefer single invoke API).
- Sync [`shared/ipcEvents.ts`](shared/ipcEvents.ts) as source of truth; treat [`public/ipcEvents.ts`](public/ipcEvents.ts) as legacy/stale if still present — either delete or stop using it (do not maintain two schemas).

**Broadcast path:** use existing `windowManager.sendToWebContents("update-status-changed", status)`.

**Throttle:** when state is `downloading`, broadcast at most every ~300ms (always send final 100% / `downloaded`).

### Version info payload

```ts
// invoke get-version-info response
{
  version: string;      // app.getVersion()
  electron: string;     // process.versions.electron
  node: string;         // process.versions.node
  platform: string;     // process.platform
  arch: string;         // process.arch
  isPackaged: boolean;  // app.isPackaged
  isDev: boolean;
}
```

### Architecture diagram

```text
package.json  ──► app.getVersion() ──► sharedState.appVersion   (keep)

electron/features/autoUpdater.ts
   │  owns UpdateStatus in main memory
   │
   ├─► broadcast update-status-changed  ──► useUpdateStatus()
   │         └── FallbackMenu, General page, optional tray
   │
   └─► invoke: get-update-status, check-for-updates,
               get-version-info, install-update

GitHub Releases (electron-builder publish) ◄── CI on tag v*
```

### Policy defaults

| Setting | Value | Rationale |
|---------|-------|-----------|
| Check on startup | Yes (packaged only) | Current behavior |
| Interval | 1 hour | Current behavior |
| `autoDownload` | **true** | Silent download; less friction |
| `autoInstallOnAppQuit` | **true** | Current behavior |
| Install UX | User confirms via menu/General | Transparent, not hostile |
| Force install | Only if below `minimumElectronVersion` | Stub config remains local for now |
| Dev checks | Off unless `TEST_AUTO_UPDATE=true` | Avoid noise |

---

## Implementation plan

### Phase 1 — Version single source of truth

1. Treat `package.json` `version` as the only authored version.
2. Fix hardcodes:
   - [`shared/constants.ts`](shared/constants.ts): stop shipping a fake `APP_VERSION = "1.0.0"` (prefer `appVersion` from shared state in UI; if a constant is needed for non-Electron contexts, document it as fallback only).
   - [`electron/utils/constants.ts`](electron/utils/constants.ts): align `PACKAGE_INFO` / remove stale `RENDERER_VERSION` if unused.
3. Add [`electron/utils/versionInfo.ts`](electron/utils/versionInfo.ts) → `getVersionInfo()` used by IPC.
4. Align GitHub constants in [`src/lib/constants.ts`](src/lib/constants.ts) with builder:
   - Owner/repo must match `electron-builder.json5` (`Aayush-Duhan/assistx`) **or** builder must be updated if the canonical remote differs — pick one source and document it in `docs/version-management.md`.

### Phase 2 — Strip shared update state + fix main updater

1. **Remove `autoUpdateState` from shared state**
   - [`shared/sharedState.ts`](shared/sharedState.ts): remove schema + field
   - [`electron/utils/shared/stateManager.ts`](electron/utils/shared/stateManager.ts): remove init + `resetState` preserve hack
   - [`shared/index.ts`](shared/index.ts): drop exports
   - [`src/stores/sharedStateStore.test.ts`](src/stores/sharedStateStore.test.ts): drop fixture field
2. **Own status in updater module**
   - Private `let updateStatus: UpdateStatus = { state: "idle" }`
   - `getUpdateStatus()`, `setUpdateStatus()` (set + broadcast, with download throttle)
   - Gate `installUpdate()` on `state === "downloaded"`
3. **Fix correctness**
   - `checkForUpdates()`: compare remote vs `app.getVersion()`; return `"none"` when equal/older
   - Extract pure `compareVersions(a, b)` for tests (handle unequal length; strip pre-release/`+meta` only if needed for AssistX’s current tags)
   - Wire `isQuittingForUpdateInstall()` in [`baseWindow.ts`](electron/windows/baseWindow.ts) so quit-and-install is not swallowed by `fakeQuit`
4. **Register full electron-updater events**
   - `checking-for-update` → `checking`
   - `update-available` → `available` (then auto-download continues)
   - `download-progress` → `downloading` (throttled broadcast)
   - `update-downloaded` → `downloaded` (+ force install if below minimum)
   - `update-not-available` → `idle`
   - `error` → `error` + log
5. **Delete dead dual path**
   - Remove [`src/hooks/useAppUpdates.ts`](src/hooks/useAppUpdates.ts)
   - Remove or stop using `GITHUB_API_RELEASES_URL` for update checks (releases URL for “open in browser” is fine)

### Phase 3 — IPC surface

Files: [`shared/ipcEvents.ts`](shared/ipcEvents.ts), [`electron/ipc/ipcHandlers.ts`](electron/ipc/ipcHandlers.ts)

1. Add invoke schemas:
   - `get-update-status` → `updateStatusSchema`
   - `get-version-info` → version info object
   - Ensure `check-for-updates` handler is actually registered (schema exists; handler missing)
2. Add renderer event:
   - `IpcToRendererEvents["update-status-changed"] = UpdateStatus`
3. Keep `install-update` on-channel.
4. Prefer removing unused `check-for-update` on-channel after grep confirms no callers.
5. No preload special-case needed — generic `ipcRenderer.invoke/on` already covers new channels.

### Phase 4 — UI / UX

1. **New** [`src/hooks/useUpdateStatus.ts`](src/hooks/useUpdateStatus.ts)
   - On mount: `invokeIpcMain("get-update-status")`
   - Subscribe: `addIpcRendererHandler("update-status-changed", …)`
   - Tolerate null/loading before first hydrate (FallbackMenu must not crash)
2. **FallbackMenu** ([`src/components/fallback-menu.tsx`](src/components/fallback-menu.tsx))
   - `appVersion` from `useSharedState()`
   - `status` from `useUpdateStatus()`
   - Show “Restart to Update” when `status.state === "downloaded"`
3. **General page** ([`src/apps/dashboard/pages/main/generalPage.tsx`](src/apps/dashboard/pages/main/generalPage.tsx))
   - About section: version, Electron, Node, platform (from `get-version-info`)
   - Updates section:
     - Button: Check for updates
     - Status copy for idle / checking / available / downloading / downloaded / error
     - Progress bar when `downloading`
     - Primary action “Restart to update” when `downloaded`
   - Match existing dashboard styling (Tailwind, existing UI components) — no separate design system
4. **Optional (if cheap):** tray menu item “Update ready — restart” when downloaded

### Phase 5 — Release tooling + docs

1. `package.json` scripts:

```json
"version:patch": "pnpm version patch --no-git-tag-version",
"version:minor": "pnpm version minor --no-git-tag-version",
"version:major": "pnpm version major --no-git-tag-version",
"release:tag": "node scripts/tag-release.mjs"
```

2. Lightweight [`scripts/tag-release.mjs`](scripts/tag-release.mjs):
   - Fail if dirty git tree
   - Accept `patch|minor|major` (or use already-bumped version)
   - Append `CHANGELOG.md` from commits since last tag
   - Commit `chore: release vX.Y.Z` + annotated tag
   - Print: push tag to trigger CI publish
3. [`docs/version-management.md`](docs/version-management.md):
   - How updates work (GitHub provider, Windows CI)
   - Operator checklist (bump → tag → push → verify Release assets + `latest.yml`)
   - Architecture note: update status is **not** shared state
   - Code signing / SmartScreen caveats
   - Canonical GitHub owner/repo
4. Seed [`CHANGELOG.md`](CHANGELOG.md) with `0.0.1` entry

### Phase 6 — Tests & validation

1. Unit tests ([`electron/features/autoUpdater.test.ts`](electron/features/autoUpdater.test.ts) or shared util test):
   - `compareVersions`: equal, older, newer, unequal segment length
   - Optional: pure status transition helper if extracted
2. Manual smoke (packaged build against a real/prerelease GitHub Release):
   - Older installed build sees update → downloads → menu + General show ready → install works
   - Dev mode does not check unless `TEST_AUTO_UPDATE=true`
3. Run `pnpm validate` (lint + typecheck + test)

---

## Suggested file change map

| File | Action |
|------|--------|
| `shared/updateStatus.ts` | **New** — Zod schema + type |
| `shared/sharedState.ts` | Remove `autoUpdateState` |
| `shared/index.ts` | Export update status; drop old autoUpdate exports |
| `shared/ipcEvents.ts` | Invokes + `update-status-changed` |
| `electron/features/autoUpdater.ts` | Own status, events, compare fix, broadcast |
| `electron/utils/versionInfo.ts` | **New** |
| `electron/ipc/ipcHandlers.ts` | Register update/version invokes |
| `electron/windows/baseWindow.ts` | Honor quit-for-update |
| `electron/utils/shared/stateManager.ts` | Remove autoUpdate init/preserve |
| `src/hooks/useUpdateStatus.ts` | **New** |
| `src/hooks/useAppUpdates.ts` | **Delete** |
| `src/components/fallback-menu.tsx` | Use `useUpdateStatus` |
| `src/apps/dashboard/pages/main/generalPage.tsx` | About + Updates UI |
| `src/stores/sharedStateStore.test.ts` | Drop `autoUpdateState` |
| `src/lib/constants.ts` / `shared/constants.ts` | Version + GitHub repo consistency |
| `package.json` | Version/release scripts |
| `scripts/tag-release.mjs` | **New** |
| `CHANGELOG.md` | **New** |
| `docs/version-management.md` | **New** |
| `electron/features/autoUpdater.test.ts` (or util test) | **New** |
| `public/ipcEvents.ts` | Delete or leave unused — do not dual-maintain |

---

## Execution order

```text
Phase 1 (version truth)
  → Phase 2 (remove shared update state + fix autoUpdater)
  → Phase 3 (IPC)
  → Phase 4 (UI)
  → Phase 5 (tooling/docs)
  → Phase 6 (tests/validate)
```

Phases 1–4 are product-critical. Phase 5 makes shipping sustainable. Phase 6 locks it in.

Suggested PR shape (optional if landing as one branch):
1. **PR A:** remove shared `autoUpdateState` + dedicated status IPC + correctness fixes (no UI polish yet; keep FallbackMenu working)
2. **PR B:** General page About/Updates UI
3. **PR C:** release scripts + docs + CHANGELOG

Or one focused branch if preferred.

---

## Acceptance criteria

- [ ] UI version matches `package.json` / `app.getVersion()` (no hardcoded `1.0.0` as real app version)
- [ ] `autoUpdateState` fully removed from `SharedState` / schema / reset special-case
- [ ] Update status lives in main updater module + `get-update-status` / `update-status-changed`
- [ ] Packaged app discovers a newer GitHub Release and downloads it
- [ ] FallbackMenu “Restart to Update” works via `useUpdateStatus`
- [ ] General page supports manual check, progress, ready, error
- [ ] Quit-and-install not blocked by window close interception
- [ ] Dead GitHub-polling hook removed; single path = `electron-updater`
- [ ] Version bump + tag workflow documented and scripted
- [ ] Unit tests cover version compare; `pnpm validate` passes

---

## Risks / notes

| Risk | Mitigation |
|------|------------|
| No local installer/`latest.yml` artifacts (only `win-unpacked`) | E2E update test needs a real GitHub Release from CI |
| Code signing absent | Document SmartScreen warnings; don’t block implementation |
| Repo mismatch (`Aayush-Duhan/assistx` vs `assistx-ai/assistx`) | Resolve in Phase 1; single canonical remote |
| FallbackMenu hydrate race | `useUpdateStatus` starts as `idle`/null-safe; updates when invoke + events arrive |
| `checkForUpdates` false positives | Compare versions explicitly; don’t treat any `updateInfo.version` as available |

---

## Later (not this pass)

- Skip/defer preferences + settings toggles
- Remote min/recommended version config service
- Pre-update user-data backup / rollback
- Schema migration runner for SQLite major bumps
- Update analytics
- Multi-platform CI publish
- macOS notarization / Windows Authenticode
