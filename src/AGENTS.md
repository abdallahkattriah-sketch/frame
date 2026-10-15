# src/ (frontend)

Notes for agents working in this folder. Root rules live in `../AGENTS.md`.

## Entrypoints

- `main.tsx` picks the app by Tauri window label or `?harbor-*=1` query: PiP, video-PiP, modal overlay, HDR overlay, DJ deck, captions, `/remote`/`/reader` (phone `MobileShell`), else `App`. Secondary Rust windows load the same bundle; adding a window means a branch here.
- `main-tv.tsx` mounts `views/big-picture/bp-tv-app.tsx` (Android TV). Never import it from `main.tsx`.
- `retro-main.tsx` is the `retro-player.html` entry (game popout).

## Views and navigation

- Adding a view: add it to the `View` union (`lib/view.tsx`), add a `frameKey()` case there, then add an import fn plus a `lazyView(...)` wrapper in `App.tsx` and its render branch in `Shell`. Optionally add it to the `useViewPreloader` idle-prefetch list.
- `setView` pushes a `Frame` onto a stack and resets scroll memory. Use the existing frame kinds (`meta`, `person`, `player`, ...) for detail-like pages instead of new views.

## Tauri bridge

- There is no wrapper module; files import `@tauri-apps/api/core` `invoke`/`listen` directly, and every call needs a non-Tauri guard (`isTauri()` or `"__TAURI_INTERNALS__" in window`), since the same code runs in a browser.
- mpv state arrives only via `listen("mpv://event")` in `lib/player/mpv.ts` (`property-change`, `end-file`, `file-loaded`, `playback-restart`, synthetic `player-failure`). The UI contract is `PlayerBridge`/`PlayerSnapshot` in `lib/player/bridge.ts`.

## Detail page episode lists

- The page scroller is `scrollRef` in `views/detail.tsx`; `useScrollMemory` restores its position on entry when `resumeDetailScroll` is on, so a scroll you add must not fight a restored position.
- Episode rows carry `data-ep` (episode number) and, for anime, `data-epid`; scroll to those rather than by index. List rows use `content-visibility: auto`, so offsets shift while rows render and a one-shot scroll lands wrong; keep re-aligning until layout settles (`views/detail/use-episode-auto-scroll.ts`).
- The anime episode section is rebuilt, not just re-rendered, when `animeDetails`' `enrichPromise` resolves (`setAnimeEpisodes` in `detail.tsx`), so component state and refs inside it reset mid-visit. State that must survive that rebuild has to live outside the component.

## Anime tracker sync (MAL / AniList / Stremio / Simkl)

- `PlayEpisode` objects for tt ids reached by Next, the queue or Continue Watching are built from Cinemeta (`loadCinemetaEpisodes` in `lib/series-episodes.ts`). They carry only TVDB `season`/`episode`: no `imdbSeason`/`imdbEpisode` and no `kitsuStreamId`. Any sync gated on `imdbSeason` silently skips them, and a fallback that sends `episode` hands MAL/AniList a TVDB number (9) instead of the entry number (186). `record()` in `views/player/hooks/use-resume-autosave.ts` builds `syncEpisode` for this. The Simkl code (`lib/simkl/scrobble.ts`, `record-watched.ts`) uses the same defaulting.
- Multi-season entries (one Kitsu/MAL entry spread over several TVDB seasons, e.g. Reborn) are numbered by `absoluteEntryNumber` in `lib/anime-entry-target.ts`. AniZip episode keys drift from absolute numbering in places (Reborn around S4E23-25 and S7E14-16), so don't treat `resolveAnimeIdentity`'s `number` as the episode for these entries.
- `setEpisodesWatchedStremio` returns `null` to mean a deliberate skip, and callers treat that as success with no retry. Detected anime on a tt id is skipped unless it passes explicit `season:imdbEpisode` keys, so a missing IMDb pair means the Stremio push silently never happens.
- When debugging, the MAL/AniList "sent" map (`harbor.mal.synced.v1.<profile>`, key `harborId|season|ep`) stores the tracker's CURRENT count as `p` when the target was at or below it. A record of `…|8|9 -> 185` therefore means Harbor sent episode 9 and the call did nothing. It does not mean Harbor sent 185.

## Settings

- A new setting touches `lib/settings/types.ts` (type), `lib/settings/defaults.ts` (`DEFAULT`), and usually a sanitizer in `lib/settings/load.ts`. If user-facing, also add a `SETTINGS_OPTIONS` entry in `views/settings/nav.tsx`.
- `SETTINGS_OPTIONS` is parsed by `scripts/settings-search-entries.mjs` via the TS AST: keep it a static array of string-literal objects (no spreads, no computed values).
- Settings dialogs must portal and sit above the title bar's z-index 140; `pnpm check:settings` enforces this. Run `check:search` after changing labels or keywords.

## Input and focus (TV / keyboard / gamepad)

- The focus engine is `lib/keyboard-navigation.ts` plus `keyboard-navigation/geometry.ts`, driven by `data-tv-*` attributes (`data-tv-nav-zone`, `data-tv-nav-cell`, `data-tv-initial-focus`, `data-tv-skip`, `data-tv-text-field`). Mark new layouts with these instead of custom key handlers.
- Activation keys are keyCodes 13/23/32 (Enter, remote Select, Space). Search-like fields take focus only and enter edit mode on activation (`isSearchLikeField`, `enterSearchEditMode`).
- The gamepad (`lib/gamepad/use-gamepad.ts`) feeds `dispatchTvNav`, so it inherits keyboard behaviour. Big Picture (`views/big-picture/`) has its own focus core (`bp-focus-core.ts`); the shell keyboard nav is disabled while it, the player or the picker is open.
- Hotkeys: defaults live in `HOTKEYS` (`lib/hotkeys.ts`) and user overrides in `settings.hotkeys`. Resolve through `effectiveBinding` / `findHotkeyMatch`, never hardcoded keys.

## Strings

- All UI text goes through `t()` / `useT()` from `@/lib/i18n`; see `lib/i18n/AGENTS.md`.
