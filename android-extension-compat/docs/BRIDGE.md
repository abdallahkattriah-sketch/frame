# Capstan bridge protocol

`src-tauri/src/capstan.rs` starts one JVM running `com.harbor.capstan.bridge.Bridge --data-dir <app data>/capstan` and talks to it in JSON lines: one JSON object per line, UTF-8, over stdin (requests) and stdout (answers). Diagnostics go to stderr, which Rust forwards to its own log as `[capstan] ...`. The bridge restores installed extensions from `<data dir>/extensions` on start.

## Frames

| Direction    | Shape                                                                       |
| ------------ | --------------------------------------------------------------------------- |
| Request      | `{"id": "c1", "method": "search", "params": {...}}`                         |
| Answer       | `{"id": "c1", "ok": true, "result": {...}}`                                 |
| Failure      | `{"id": "c1", "ok": false, "error": {"code": "...", "message": "..."}}`     |
| Host request | `{"id": "h1", "host": "challenge", "params": {"url": "..."}}`               |
| Host answer  | `{"id": "h1", "ok": true, "result": {"cookie": "...", "userAgent": "..."}}` |

- Requests are answered concurrently, so answers can arrive out of order; match them by `id`. A line that is not JSON, or has no `id` or `method`, fails with `bad_request` and an empty `id`.
- Every request accepts an optional `timeoutMs` (clamped to 1 s to 600 s, default 130 s). Rust waits that long plus 15 s, and starts a fresh bridge once if the process died.
- A host request goes the other way: an extension asks Harbor to clear a Cloudflare challenge for `url`. Rust answers it with the cookie and user agent from its own solver, or a failure, and any other `host` method fails with `unknown_method`.

## Methods

| Method          | Params                                                                         | Result                                                                                             |
| --------------- | ------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| `ping`          | none                                                                           | `pong: true`, `protocol` (currently `1`), `extensions` and `providers` counts                      |
| `install`       | `path` of the extension file                                                   | the installed extension                                                                            |
| `uninstall`     | `id` of the extension                                                          | the removal outcome                                                                                |
| `extensions`    | none                                                                           | `extensions`: id, name, version, entryClass, file, source, providers, extractors, unavailable      |
| `providers`     | none                                                                           | `providers`: id, extensionId, name, lang, mainUrl, types and capability flags                      |
| `catalogue`     | `providerId`                                                                   | `providerId`, `hasMainPage`, `rows`: name, data, horizontalImages, declared                        |
| `cataloguePage` | `providerId`, `row` (a row name from `catalogue`), optional `page` (default 1) | `providerId`, `row`, `page`, `hasNext`, `sections`: name, horizontalImages, `items`                |
| `search`        | `providerId`, `query`, optional `page`, optional `quick`                       | `providerId`, `page`, `results`                                                                    |
| `load`          | `providerId`, `url`                                                            | `providerId`, `found`, and `result` (the media item with its episodes) when found                  |
| `loadLinks`     | `providerId`, `data`, optional `isCasting`                                     | `providerId`, `success`, `links` (source, name, url, referer, quality, type, headers), `subtitles` |
| `shutdown`      | none                                                                           | `stopping: true`; the process exits shortly after                                                  |

- `catalogue` lists a provider's rows; `cataloguePage` fetches one row by its name, so a page is addressed by the row it belongs to rather than by row data. Its items live inside `sections`, never in a flat list, and `hasNext` is `false` on the last page.
- Search results and section items share one shape: name, url, apiName, type, posterUrl, posterHeaders, quality, score.
- `cataloguePage`, `search`, `load` and `loadLinks` add a `note` when they come back empty and the provider recorded why, so the UI can say more than "nothing found".

## Error codes

| Code                  | Meaning                                               |
| --------------------- | ----------------------------------------------------- |
| `bad_request`         | Unparseable frame, or a required parameter is missing |
| `unknown_method`      | The method is not one of the above                    |
| `provider_not_found`  | No installed provider has that `providerId`           |
| `extension_not_found` | No installed extension has that `id`                  |
| `install_failed`      | The file could not be loaded as an extension          |
| `extension_error`     | The extension threw; `message` names the exception    |
| `timeout`             | The extension did not answer within `timeoutMs`       |

The dispatch lives in `src/host/BridgeServer.kt`, the frames and codes in `src/host/BridgeProtocol.kt`, and the result encoding in `src/host/BridgeEncode.kt`. Rust wraps each method in a `capstan_*` command in `src-tauri/src/capstan.rs`; add a method on both sides and here together.
