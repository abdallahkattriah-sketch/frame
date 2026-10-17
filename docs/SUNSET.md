# Running Harbor after the official project shut down

The official Harbor project ended in October 2026. `harbor.site` now serves only a "Harbor is Sunsetting" page (citing legal and personal reasons) and the `harborstremio` GitHub organization, its repository, releases and pull requests return 404. This fork (`crazyrabbit0/harbor`) is maintained on its own from here: `main` holds the current code (upstream's final `beta-branch` plus this fork's work), and `beta-branch` stays at upstream's last beta commit.

## What still works

The app talks to Stremio, addons and most metadata services directly, so the core experience is unaffected:

- Stremio sign-in, library and Continue Watching; Cinemeta and installed addons; streams, debrid, torrents and the mpv player.
- TMDB, OMDB, Fanart.tv and RPDB with your own keys.
- Subtitles, and skip intro/outro from SkipDB, TheIntroDB, introdb.app, AniSkip and chapter markers.
- Anime metadata from Kitsu and AniZip, stream ranking, local files, Plex, Jellyfin and Emby.
- TVDB (episode orders, episode lists, artwork, stills, cast, collections), as long as a TVDB API key is set in Settings > Library. Every TVDB request goes straight to `api4.thetvdb.com`; without a key these features stay empty.
- Trakt sign-in, scrobbling and token refresh, through this fork's Trakt app: just connect. Harbor calls `api.trakt.tv` directly with device sign-in and no client secret. You can use an app of your own instead (Settings > Trackers > Trakt > Your Trakt app), and builds can override the default with `VITE_TRAKT_CLIENT_ID`.
- MyAnimeList sign-in and token refresh, through this fork's MAL client (App Type "other", so no secret). Harbor does OAuth2 PKCE (`plain`) against `myanimelist.net/v1/oauth2/token`. The desktop app catches the redirect on `http://localhost:47321/harbor-mal` (`src-tauri/src/mal_auth.rs`); if that port is busy, or in the browser build, you paste the redirected address into Harbor instead. You can use a client of your own instead (register the same redirect URL), and builds can override the default with `VITE_MAL_CLIENT_ID`.
- AniList sign-in, with no setup: the implicit grant on Harbor's AniList client shows the token on AniList's pin page, and you paste it into Harbor.
- Simkl community ratings, straight from `api.simkl.com/ratings`.
- Watch parties through your own Cloudflare relay (Settings > Relay).
- Bug reports from Settings, the crash screen and the menu bar, as prefilled issues on this fork's GitHub (attachments are dragged in on GitHub).
- The speech-to-text model, downloaded from whisper.cpp's Hugging Face repository.
- Chromecast video and audio, through Google's Default Media Receiver.
- In-app updates on Windows, macOS and the Linux AppImage, from this fork's GitHub releases. Builds up to 0.9.201 carry upstream's updater key, so they have to be replaced by hand once with a later release. Rolling back to an earlier build and rating a build (as a GitHub issue) work from Settings > Updates.
- Award badges on movie and show pages (Wikidata plus lists built into the app), anime award badges matched by title (the built-in Crunchyroll, TAAF, Japan Media Arts, Animation Kobe and r/anime lists), and the Discover "Award winners" row, which is built from the built-in award history plus TMDB when a TMDB key is set.
- Static feeds load from this repository's `data/` folder through `raw.githubusercontent.com` (`HARBOR_DATA_BASE` in `src/lib/config/endpoints.ts`), so they work again once `data/` is on `main`: anime award badges matched by Kitsu ID (`anime-awards.json`, built from the bundled award lists and title map), anime hero art (`anime-hero-art.json`, the bundled snapshot), release notes for 0.9.119 to 0.9.128 (`release-notes.json`), and Discord Rich Presence images (the app icon plus award art for the Oscars, Golden Globes, BAFTA, Critics Choice, SAG, Venice, Berlin, Crunchyroll, TAAF, Japan Media Arts and r/anime; Emmy, Cannes and Animation Kobe fall back to the Harbor logo). Feeds whose data could not be recovered ship empty in the shape the app expects and can be filled by pull request: the hosted anime hero, curated logos, announcements, the hosted award-winners and hero pools, the manga source list and the Harbor people rankings.
- IGDB in Games (catalogs, details, completion times, favorites search), once a Twitch client ID and secret are set in Settings > Library > Games. Requests go straight to `id.twitch.tv` and `api.igdb.com`; without the credentials the Games catalog stays empty and says how to add them.
- Browsing and installing community themes, from the read-only index in `data/themes/` (seeded with the built-in presets). New themes join it by pull request (`data/themes/README.md`); publishing, ratings, comments, notifications and the "My themes" tab needed Harbor accounts and are hidden.

## What no longer works

These relied on services hosted at `harbor.site` and its subdomains, which are gone:

| Feature                                                                                               | Dead service                                               |
| ----------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| Beta and experimental channels                                                                        | `harbor.site/updates/...`                                  |
| Theme publishing, ratings and comments, profile badges, public profiles, shared collections and lists | `harbor.site/themes/api`, `/collection`, `/list`           |
| Harbor's own badge packs (Minimal, Abstract, Harbor Light, Harbor Color), removed from the list       | `harbor.site/badges`                                       |
| Shared ad-skip segments and ad reports                                                                | `harbor.site/updates/ad-segments.json`, `bugs.harbor.site` |
| Shared subtitle autosync                                                                              | `sync.harbor.site`                                         |
| Public watch-party relay                                                                              | `pub.harbor.site`                                          |
| Suggesting a manga source from the app                                                                | `harbor.site/api/manga-sources/suggest`                    |

Every Harbor service base URL can also be pointed elsewhere at build time through `VITE_HARBOR_API_BASE` and the other variables in `src/lib/config/endpoints.ts`; `VITE_HARBOR_DATA_BASE` moves the static feeds (for example to a fork or a branch).

## Building from a fresh clone

- `libmpv-2.dll` (Windows, mpv `v0.41.0-1084-ga1bf4b655`, SHA-256 `0a81c004aae0ee7d512b9a26e38f66281f9591e84e1663215cc3a36a4bde6f6a`) is too large for git (115 MB, and GitHub refuses Git LFS uploads to a public fork), so it lives on this fork's [`libmpv-0a81c004aae0` release](https://github.com/crazyrabbit0/harbor/releases/tag/libmpv-0a81c004aae0). `pnpm run setup:libmpv` downloads it from there into `src-tauri/libmpv/`. If that fails it falls back to [`mpv-dev-x86_64-20260927-git-a1bf4b6559.7z`](https://github.com/shinchiro/mpv-winbuild-cmake/releases/download/20260927/mpv-dev-x86_64-20260927-git-a1bf4b6559.7z) from `shinchiro/mpv-winbuild-cmake`, whose `libmpv-2.dll` is byte-identical (needs `7z` on PATH). That project keeps only about a month of daily releases, so the fork release is the copy to rely on. Other builds of the same mpv commit (the `x86_64-v3` variant, `zhongfly/mpv-winbuild`) are not byte-identical.
- `mpv.exe`, ffmpeg, yt-dlp and fonts come from their own public projects and are unaffected.
- `android-extension-compat/tools/deps.sh` still downloads `nanojson-e9d656d.jar` from the deleted repository, so the Android extension layer cannot be provisioned from scratch. Build without it with `HARBOR_CAPSTAN_SRC=<nonexistent dir>` and `HARBOR_CAPSTAN_OPTIONAL=1`.

## Upstream's old `main` branch

Upstream's `main` (kept as the tag `upstream-main`) was an older 0.9.21 line with about 30 commits that never reached beta. Most were earlier versions of work beta later redid (liquid glass, focus styles, Linux SVP, season picker placement). These look genuinely missing from beta and could be ported from the old history if wanted:

| Commit     | Change                                                                |
| ---------- | --------------------------------------------------------------------- |
| `b8bafdad` | Russian UI translation (`ru.json`)                                    |
| `169a4f2a` | Safety net so `layout:custom` themes never end up with no navigation  |
| `c97e7a8f` | Poster images retry after transient load failures (`poster-retry.ts`) |
| `2cf18ad3` | macOS crash on audio device hotplug                                   |
| `15003a6e` | Remember the fullscreen window state                                  |
| `68f050ea` | Block injection through addon-controlled stream URLs                  |
| `a35f59e6` | RTL layout of the PIN entry                                           |
| `e77dc71d` | Leave Linux updates to the package manager                            |

They remain reachable through the `upstream-main` tag.
