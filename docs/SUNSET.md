# Running Harbor after the official project shut down

The official Harbor project ended in October 2026. `harbor.site` now serves only a "Harbor is Sunsetting" page (citing legal and personal reasons) and the `harborstremio` GitHub organization, its repository, releases and pull requests return 404. This fork (`crazyrabbit0/harbor`) is maintained on its own from here: `beta-branch` holds the current code and `main` is kept identical to it.

## What still works

The app talks to Stremio, addons and most metadata services directly, so the core experience is unaffected:

- Stremio sign-in, library and Continue Watching; Cinemeta and installed addons; streams, debrid, torrents and the mpv player.
- TMDB, OMDB, Fanart.tv and RPDB with your own keys.
- Subtitles, and skip intro/outro from SkipDB, TheIntroDB, introdb.app, AniSkip and chapter markers.
- Anime metadata from Kitsu and AniZip, stream ranking, local files, Plex, Jellyfin and Emby.
- TVDB (episode orders, episode lists, artwork, stills, cast, collections), as long as a TVDB API key is set in Settings > Library. Every TVDB request goes straight to `api4.thetvdb.com`; without a key these features stay empty.
- Watch parties through your own Cloudflare relay (Settings > Relay).
- Award badges on movie and show pages (Wikidata plus lists built into the app), anime award badges matched by title (the built-in Crunchyroll, TAAF, Japan Media Arts, Animation Kobe and r/anime lists), and the Discover "Award winners" row, which is built from the built-in award history plus TMDB when a TMDB key is set.

## What no longer works

These relied on services hosted at `harbor.site` and its subdomains, which are gone:

| Feature                                                                                       | Dead service                                                |
| --------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| In-app updates, beta channel, rollback to older builds                                        | `harbor.site/updates/...`                                   |
| Trakt sign-in and token refresh                                                               | `harbor.site/api/trakt/token`, `/api/trakt/device-token`    |
| MAL sign-in                                                                                   | `harbor.site/api/mal/token`                                 |
| Simkl ratings                                                                                 | `harbor.site/api/simkl/ratings`                             |
| Theme store, theme badges, public profiles, shared collections and lists                      | `harbor.site/themes/api`, `/badges`, `/collection`, `/list` |
| Anime award badges matched by ID, anime hero art, curated logos, announcements, release notes | static JSON files on `harbor.site`                          |
| Award images in Discord Rich Presence                                                         | `harbor.site/discord/awards`                                |
| Shared ad-skip segments and ad reports                                                        | `harbor.site/updates/ad-segments.json`, `bugs.harbor.site`  |
| Bug reports and feedback from Settings                                                        | `bugs.harbor.site`                                          |
| Shared subtitle autosync                                                                      | `sync.harbor.site`                                          |
| Public watch-party relay                                                                      | `pub.harbor.site`                                           |
| IGDB data in Games, manga source list                                                         | `harbor.site/api/igdb`, `/api/manga-sources`                |
| Speech-to-text model download                                                                 | `harbor.site/models/ggml-tiny.bin`                          |

Trakt can be restored without Harbor's server by registering a Trakt app and doing the token exchange in the client with its own client ID and secret (`traktClientId` / `traktClientSecret` already exist in settings but are unused). MAL works the same way. Every Harbor service base URL can also be pointed elsewhere at build time through `VITE_HARBOR_API_BASE` and the other variables in `src/lib/config/endpoints.ts`.

## Building from a fresh clone

- `libmpv-2.dll` (Windows, mpv `v0.41.0-1084-ga1bf4b655`, SHA-256 `0a81c004aae0ee7d512b9a26e38f66281f9591e84e1663215cc3a36a4bde6f6a`) is too large for git (115 MB, and GitHub refuses Git LFS uploads to a public fork), so it lives on this fork's [`libmpv-0a81c004aae0` release](https://github.com/crazyrabbit0/harbor/releases/tag/libmpv-0a81c004aae0). `pnpm run setup:libmpv` downloads it from there into `src-tauri/libmpv/`. If that fails it falls back to [`mpv-dev-x86_64-20260927-git-a1bf4b6559.7z`](https://github.com/shinchiro/mpv-winbuild-cmake/releases/download/20260927/mpv-dev-x86_64-20260927-git-a1bf4b6559.7z) from `shinchiro/mpv-winbuild-cmake`, whose `libmpv-2.dll` is byte-identical (needs `7z` on PATH). That project keeps only about a month of daily releases, so the fork release is the copy to rely on. Other builds of the same mpv commit (the `x86_64-v3` variant, `zhongfly/mpv-winbuild`) are not byte-identical.
- `mpv.exe`, ffmpeg, yt-dlp and fonts come from their own public projects and are unaffected.
- `android-extension-compat/tools/deps.sh` still downloads `nanojson-e9d656d.jar` from the deleted repository, so the Android extension layer cannot be provisioned from scratch. Build without it with `HARBOR_CAPSTAN_SRC=<nonexistent dir>` and `HARBOR_CAPSTAN_OPTIONAL=1`.
- Links in the app to `github.com/harborstremio/harbor` (bug reports, releases, contributor pages) lead to a 404.

## The old `main` branch

Before it was made identical to `beta-branch`, `main` was an older 0.9.21 line with about 30 commits that never reached beta. Most were earlier versions of work beta later redid (liquid glass, focus styles, Linux SVP, season picker placement). These look genuinely missing from beta and could be ported from the old history if wanted:

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

They remain reachable in `main`'s history (first parent of the merge that brought in beta).
