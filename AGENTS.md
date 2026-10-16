# AGENTS.md

Harbor is a cross-platform Stremio client built with Tauri 2, React, TypeScript, Rust and libmpv. The frontend owns the interface and user interactions; Rust owns native integrations, playback, operating-system behavior and performance-sensitive work. Folder-specific notes live in `src/AGENTS.md`, `src/lib/i18n/AGENTS.md`, `src-tauri/AGENTS.md` and `android-extension-compat/AGENTS.md`.

## The fork is the project now

- The official Harbor project shut down in October 2026: `harbor.site` serves only a sunset page and `github.com/harborstremio/harbor` (remotes `harbor` and `upstream`) returns 404, so fetches from them fail with "Repository not found". `docs/SUNSET.md` lists which features died with Harbor's servers and how to build from a fresh clone.
- `origin` (`crazyrabbit0/harbor`) is the only live remote. `main` is the integration branch: upstream's final `beta-branch` with this fork's work on top. Branch new work from `origin/main` and merge it into `main` with `git merge --no-ff`; there are no upstream PRs to open. `beta-branch` stays frozen at upstream's last beta commit (`8274f054`), and the tag `upstream-main` keeps upstream's old 0.9.21 `main`.
- GitHub refuses Git LFS uploads to a public fork ("can not upload new objects to public fork"), so a large binary cannot live in git here. `libmpv-2.dll` sits on the fork's `libmpv-0a81c004aae0` release, and `scripts/fetch-libmpv.mjs` downloads it from there, falling back to the byte-identical shinchiro `mpv-dev-x86_64-20260927` archive.
- Services on `harbor.site` (Trakt/MAL token exchange, updates, themes, award JSON, bug reports, sync, relay) no longer answer. TVDB goes straight to `api4.thetvdb.com` with the user's key (`setTvdbKey`/`tvdbGet` in `src/lib/providers/tvdb.ts`); bring back any other feature the same way, by calling the real service directly.

## Priorities and working rules

- Correctness and reliability first, then smooth playback and responsive navigation, consistent behavior across Windows, macOS, Linux and TV-style input, and simple, maintainable code. When trade-offs are required, prefer predictable behavior over clever or temporary solutions.
- Read the relevant files before changing them, inspect existing code before adding abstractions, and reuse shared logic instead of duplicating it. Follow the existing naming and code style.
- Keep changes limited to the task: no unrelated refactors, fix root causes rather than adding local workarounds, preserve backward compatibility, and never silently change user-facing behavior.
- Keep components focused and small, and keep business logic outside React components when it can be a reusable module. Keep platform-specific behavior isolated.
- Add comments only when they explain a non-obvious decision. Never expose secrets, tokens, private URLs or user data.

## Architecture

- `src/`: React and TypeScript app. `src/components/` holds reusable UI, `src/hooks/` shared React behavior, `src/lib/` framework-independent modules.
- Navigation is a custom view/frame stack in `src/lib/view.tsx`; there is no router (no TanStack Router or Query, only `@tanstack/react-virtual`). Data fetching is plain `fetch` via `src/lib/safe-fetch.ts` plus module stores in `src/lib/`.
- `src-tauri/`: Tauri app and native Rust (commands, playback, window management, platform code).
- `harbor-core/`: Rust stream parsing and ranking. The app does NOT load it as WASM despite the README: desktop runs it natively through the Tauri command `streams_run_pipeline` (`src-tauri/src/streams.rs`), and without Tauri, or on any invoke error, `src/lib/streams/pipeline.ts` falls back to the TS implementation in `src/lib/streams/` (`parser.ts`, `trust.ts`, `scoring/`). No test checks Rust/TS parity, so a ranking change in one is not reflected in the other unless you port it.
- Reference repositories for established patterns (don't copy large implementations): Stremio protocol and app behavior <https://github.com/Stremio/stremio-core>, mpv lifecycle and desktop playback <https://github.com/jellyfin/jellyfin-desktop>, Tauri and libmpv integration <https://github.com/MaxMB15/MaxVideoPlayer>.

## Playback, navigation and input

- mpv is the source of truth for playback state; keep the React interface synchronized through events rather than assumptions. Avoid blocking work inside mpv callbacks, and don't mix platform-specific window logic with general playback logic.
- Focus and activation are separate actions: focusing an input must not start editing it, and inputs become editable only after explicit activation. Keyboard, remote and gamepad navigation must behave consistently, and the user's configured hotkeys must be preserved.

## Before finishing a task

- Lint the changed files (`vp check`, see Commands), and typecheck after TypeScript changes with `pnpm run typecheck` (`tsc --noEmit -p tsconfig.json`). Never use `tsc -b` for a typecheck: it emits `vite.config.js` and `vite.config.d.ts` (both gitignored), and writing them restarts the dev server. `tsc -b` belongs only in the `build` scripts.
- After Rust changes run `cargo check --manifest-path src-tauri/Cargo.toml`. The full Linux binary builds with `pnpm tauri:build:linux-system`.
- Test platform-specific changes on the affected platform when possible, and leave no warnings or errors introduced by the task. If a repository-wide check fails on untouched files, record the baseline and don't reformat or refactor unrelated files.

## Commands

- `pnpm run check` / `vp check` needs the Vite+ `vp` CLI, which is NOT a package dependency and is not installed globally ("'vp' is not recognized"). CI installs it with `voidzero-dev/setup-vp`. Run it through pnpm instead: `pnpm dlx --package=vite-plus@1.1.0 vp check --no-fmt <files>` for lint, and `vp fmt --check .` (same `dlx` prefix) inside a temp dir holding LF copies plus `.oxfmtrc.json` for format. The "built-in command" note and `esbuild` deprecation warnings it prints are noise; read the `pass:`/error line. `npx -y oxlint@latest` / `oxfmt@latest` remain a fallback.
- This repo's `.git/config` sets `core.autocrlf=false`, which overrides the system-wide `true`, but older checkouts still have CRLF files (`git ls-files --eol` shows `i/lf w/crlf`). Save edited files with LF, otherwise the whole file shows as rewritten in `git diff` and gets committed with CRLF. If an edit tool keeps the file's CRLF, convert it back to LF before staging.
- Run `oxfmt` on LF copies, never the working tree: `core.autocrlf=true` here makes every working-tree file fail `--check`, even untouched ones. Check `git show HEAD:<file>` blobs written to a temp dir, or a worktree made with `git -c core.autocrlf=false worktree add`.
- The whole repository on `main` is formatted with `vp fmt` (`.prettierignore` excludes vendor, minified and generated files), so `vp fmt --check` on a changed file must pass.
- CI lint scope is changed files only: `vp fmt --check <files>` on code/config/md files, then `vp check --no-fmt <js/ts files>`, then `vp run typecheck` and `vp run test`.
- Single test file: `node --experimental-loader ./scripts/node-test-loader.mjs --test tests/<name>.test.ts`. The loader resolves `@/` to `src/` and extensionless imports; plain `node --test` cannot load these files. Tests are flat `tests/<topic>.test.ts`; harnesses in `tests/helpers/`, `_*.ts` stubs (localStorage, IndexedDB) in `tests/` are excluded from the glob.
- Rust checks without the fetched sidecars: CI sets `TAURI_CONFIG='{"bundle":{"externalBin":[],"resources":[]}}'` for `cargo check` / `cargo test --manifest-path src-tauri/Cargo.toml`. Set the same variable when `pnpm run setup` hasn't been run.
- `harbor-core` CI (run inside `harbor-core/`): `cargo test --all-targets`, `cargo clippy --all-targets -- -D warnings`, `cargo check --target wasm32-unknown-unknown`. Any clippy warning fails CI.
- Local-only validators (not in CI): `pnpm check:settings` and `check:search` after settings UI/search edits; `check:tvstrings`, `check:tvinvariants`, `check:tvresources`, `check:orphanstrings` after Android TV Kotlin / `strings.xml` edits; `node scripts/check-i18n.mjs` after locale edits.

## Dev server and build quirks

- `pnpm dev` runs `scripts/capstan-stage.mjs --dev` first (Java runtime preflight for the extension bridge, always exits 0), then Vite on `127.0.0.1:1420` with `strictPort`, so it fails rather than switching ports if 1420 is busy.
- `src-tauri/` is excluded from the Vite watcher, so Rust changes need `pnpm tauri dev`, not HMR.
- `build:tv` / `--mode android` builds `index-tv.html` (`src/main-tv.tsx`) with a `chrome87` syntax floor. Don't use newer syntax in code the TV entry reaches.
- The app also runs in a plain browser. Outbound HTTP goes through `safeFetch`, which rewrites listed hosts to `/api-proxy/<host>/...` off-Tauri; a new third-party host needs entries in both `safe-fetch.ts` and the `vite.config.ts` proxy list.
- `hbx.mjs` evaluates JS in the running app over CDP (`127.0.0.1:9333`) for live debugging. The port only exists when Harbor starts with `WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS=--remote-debugging-port=9333` (`scripts/dev-diag.ps1` does this for `pnpm tauri dev`; set it the same way before launching a release exe).
- Dev and release builds keep separate WebView storage: dev runs on origin `http://localhost:1420`, release on `http://tauri.localhost`, so `pnpm tauri dev` starts with default settings and no watch history. Both still write the shared `%APPDATA%\app.harbor\settings.json` (`settings_write`), so a dev session overwrites the real profile's settings file. Back it up first; to test against the real profile, use a release build.
- Some tests evaluate a component's compiled source with a mock `require` that only allows listed imports (e.g. `tests/addon-episode-selection.test.ts` for `cinemeta-episodes.tsx`). Adding an import to such a component fails them with `Unexpected import: <path>` until the mock list gets an entry.
- Other tests regex-match a module's source text, so renaming a local variable or argument breaks them with "input did not match the regular expression". Example: `tests/cw-anime-sync-ids.test.ts` asserts literal call shapes in `use-resume-autosave.ts` such as `animeIdentityEligibleForSync(id, syncEpisode)`. Before renaming anything in the player hooks, `git grep` the `tests/` folder for the old text.
- `tests/helpers/playback-persistence-harness.ts` swaps every import of `use-resume-autosave.ts` for a stub in `dependencies`, so a new import in that hook needs a matching stub there. Tracker sync resolves in a `.then(async …)` chain, so wait with `await new Promise((r) => setTimeout(r, 0))`; two `await Promise.resolve()` calls are not enough.

## Release builds (Windows)

- `pnpm tauri build` stops in `beforeBuildCommand` with `[capstan] no libs at ...android-extension-compat\libs` (exit 1, before any Rust compiles) when the gitignored compat jars are absent. Fetch them (`pnpm run setup` / `android-extension-compat/tools/deps.sh`), or build deliberately without extensions: `HARBOR_CAPSTAN_SRC=<nonexistent dir>` plus `HARBOR_CAPSTAN_OPTIONAL=1`. `OPTIONAL` alone is not enough: it only excuses a checkout with no layer directory at all.
- Quick frontend-only rebuild of an existing release exe: `pnpm exec vite build`, then `pnpm tauri build --no-bundle --config <file>` where the file holds `{"build":{"beforeBuildCommand":""}}` (pass a file; inline JSON loses its quotes in PowerShell). Rust is cached, so this takes ~5 min, and the exe embeds `dist/`.
- Before building, stop every process whose executable is under `src-tauri\target\release`, not only `harbor.exe`. The build copies sidecars into that folder and fails with `os error 32` (file in use) after several minutes of compiling. A renamed copy (e.g. `harbor.old.exe`) and the `mpv.exe` it spawns lock the folder too. Filter by `ExecutablePath`, never by process name. The user may be watching something, so ask before stopping anything.
- `pnpm tauri build` rewrites `src-tauri/Cargo.toml`; run `git checkout -- src-tauri/Cargo.toml` afterwards so it doesn't show up as a change.
- A cold release build is ~25 min (~900 crates, 8 threads). Use `--no-bundle` for just the exe, `--bundles nsis` for only the installer.
- A git-excluded `.cargo/config.toml` (via `.git/info/exclude`) can set `rust-lld.exe` as the MSVC linker and `[profile.release] incremental = true, codegen-units = 256` for faster local builds. Changing profile settings invalidates the whole release cache once. Delete the file for a build that ships, since 256 codegen units costs some runtime speed.
- `target\release\harbor.exe` is not standalone: it statically imports `libmpv-2.dll` (won't launch without it), finds `mpv`/`ffmpeg`/`ffprobe`/`yt-dlp` and `fonts\`/`resources\` next to itself, and needs the VC++ 2015-2022 x64 redistributable (`MSVCP140.dll`) and WebView2 on the target machine. Distribute the NSIS installer from `target\release\bundle\nsis\` instead.

## Releases

- Every push to `main` (outside docs and markdown) runs the Release workflow (`.github/workflows/tauri-build.yml`). Its first job runs `node scripts/bump-version.mjs --next`: the checked-in version ships as is until a `v<version>` tag exists, after that each push takes the next patch. When the version changes, the bot commits `chore(release): v<x.y.z>` to `main`, so `git pull` before the next push.
- It then builds Windows (NSIS `-setup.exe` and the managed `-installer.exe`), macOS Apple silicon `.dmg`, Linux x86_64 and arm64 `.deb`/`.AppImage`, and the Flatpak (`flatpak.yml` as a reusable workflow), and publishes them as the GitHub release `v<x.y.z>` with generated notes. The macOS Intel dmg stays a workflow artifact: its Homebrew libmpv requires macOS 15.
- Versions are plain numbers (`x.y.z`): Windows file versions are numeric, so the managed installer step's version check rejects suffixes like `-cr`. The fork's line starts at `0.9.200`, well past upstream's last beta `0.9.132`. To jump to a new minor, run `node scripts/bump-version.mjs <x.y.z>` and commit; it rewrites `package.json`, both `tauri.conf.json`, both `Cargo.toml` and `Cargo.lock`, and the Flatpak metainfo release.
- `app-build.yml` compiles Windows, macOS and Linux without installers on pull requests only, since the Release workflow already builds `main`. Keep both Linux builds: the system-library build (`.deb`/`.AppImage`) and the Flatpak sandbox use different toolchains, so either one can break while the other stays green.
- To test a change locally, build `main` (or the feature branch) with `pnpm tauri build --no-bundle` and the capstan variables above, about 7–15 min warm, then launch `target\release\harbor.exe`.

## Formatting

- `.oxfmtrc.json` applies `quoteProps: "consistent"` to locale files only. The pre-commit hook (`.vite-hooks/pre-commit`) runs `vp staged` (`vp check --fix`), so it also needs `vp`; without it, commit with `--no-verify` after running `oxlint`/`oxfmt` as above.
- `oxfmt` wraps long locale entries as `"key":\n    "value",` once the line passes its width; write new long translations that way.
