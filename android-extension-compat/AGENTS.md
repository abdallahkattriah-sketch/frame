# android-extension-compat/ ("capstan")

Notes for agents working in this folder.

## What it is

- A Kotlin/Java compat layer that runs Android (CloudStream-style) extensions on a desktop JVM. `src-tauri/src/capstan.rs` spawns it as one bridge process (`com.harbor.capstan.bridge.Bridge`) speaking JSON lines over stdin/stdout. Methods include ping, install, providers, search, load, loadLinks and catalogue.
- Rust finds Java in this order: bundled `resources/capstan/runtime/`, then `HARBOR_JAVA`, then `JAVA_HOME`, then `java` on PATH (`src-tauri/src/capstan/locate.rs`).

## Build and stage

- `tools/build.sh` (POSIX sh, so use WSL or Git Bash on Windows) compiles Kotlin in-process via `tools/kc.sh` (`-jvm-target 17`) and Java with `$JAVA_HOME/bin/javac` into `out/capstan.jar`. It needs JDK 17+, and `tools/*.jar` + `libs/` are gitignored (fetched by `tools/deps.sh`).
- `scripts/capstan-stage.mjs` rebuilds the jar when stale, jlinks a 9-module runtime into `src-tauri/resources/capstan/`, then always runs `capstan-verify.mjs`, which starts the staged runtime and requires a `ping` reply.
- It runs automatically from `pnpm dev` (`--dev`: report only, never fails) and `build:desktop` (fails the build). Check the staging without building via `pnpm check:capstan`.
- JDK resolution (`scripts/capstan-jdk.mjs`): `HARBOR_CAPSTAN_JDK` / `JAVA_HOME`, else a Temurin download cached in `~/.harbor/capstan-jdk`; `HARBOR_CAPSTAN_JDK_TARGET` is used for cross-target staging.

## Tests

- These are plain programs, not JUnit/Gradle. `test/*.kt` compiles to `out/test-classes` as part of `build.sh`, and runs through `tools/*gate.sh`, `loadertest.sh`, `bridge-test.sh` and `selftest.sh`. Build first.
