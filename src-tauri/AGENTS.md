# src-tauri/ (Rust shell)

Notes for agents working in this folder.

## Commands and windows

- Register every `#[tauri::command]` in BOTH handler lists: `src/lib.rs` (`generate_handler!` around L998) and `src/mobile.rs` (L80). Mobile is a separate macro and does not inherit desktop entries. Gate platform-only entries with `#[cfg(...)]` inside the list.
- App commands need no capability entry, but plugin APIs do (`capabilities/*.json`), and capabilities match windows by label. A new window label needs adding to a capability's `windows` list; e.g. `harbor-video-pip` is only in `video-pip.json`.
- Secondary windows load the frontend with a `?harbor-*=1` query that `src/main.tsx` dispatches on.

## Cargo and platform gates

- In `[target.'cfg(...)'.dependencies]`, `cfg(desktop)` silently matches nothing. Use `cfg(not(any(target_os = "android", target_os = "ios")))`.
- In `build.rs`, branch on `CARGO_CFG_TARGET_OS`, not `cfg!(...)` (that evaluates the host).
- The dev profile uses `opt-level = 2` for the crate and all deps, so the first build is slow. That is intentional.
- No `[profile.release]` here; local release speedups live in the git-excluded root `.cargo/config.toml` (see the root `AGENTS.md`, "Release builds"). Don't move them into the tracked `Cargo.toml`.
- Platform files use suffixes (`_windows`, `_win`, `_mac`, `_linux`); follow the suffix already used in the module you're editing.

## mpv

- One OS thread (`spawn_event_loop`, `src/mpv.rs`) waits on mpv and emits everything as `mpv://event` (`{event, ...}`); `time-pos` is throttled to 200 ms. Anything slow on that thread delays every playback event, so move it to `spawn_blocking`/`tokio::spawn`.
- Event payload names are the frontend contract (`src/lib/player/mpv.ts`). Change both sides together.

## Bundled inputs

- `externalBin` (`yt-dlp`, `ffmpeg`, `ffprobe` as `binaries/<name>-<triple>`), Windows `libmpv/libmpv-2.dll` and `resources/capstan/` come from `pnpm run setup`. `resources/pokemon-engine/` is NOT produced by setup (CI runs `node tools/pokemon-engine/build.mjs`).
- Linux `build.rs` panics if no libmpv is found (pkg-config `mpv`, then fixed lib dirs). CI installs `libmpv-dev`.
- Config overlays: `tauri.windows.conf.json` (auto on Windows), `tauri.linux-system.conf.json` (system ffmpeg/yt-dlp, no sidecars), `tauri.updater.conf.json` (CI release only), `tauri.android.conf.json` (`build:tv`, no capstan).

## vendor/ and patches

- `vendor/leveldb-sys` builds via CMake from `src/build.rs` (not a root `build.rs`), with `CMAKE_POLICY_VERSION_MINIMUM=3.10` and `HAVE_CLANG_THREAD_SAFETY=OFF` pinned for CMake 4.x. On Windows it finds CMake via `vswhere`. Paths with spaces are quoted; keep it that way.
- `[patch.crates-io]` patches `librespot-core` and `librqbit`. Read the comments in `Cargo.toml` before bumping either.

## Tests

- No integration tests: `tests/` holds only fixtures (pulled in with `include_bytes!`). Tests are inline `#[cfg(test)]` or sibling `*_tests.rs` in `src/games/`.
- Single test: `cargo test --manifest-path src-tauri/Cargo.toml <module::path substring>`, with `TAURI_CONFIG` set as in the root notes if setup wasn't run.
