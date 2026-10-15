// @ts-expect-error Node test types are intentionally outside the browser-only tsconfig.
import assert from "node:assert/strict";
// @ts-expect-error Node test types are intentionally outside the browser-only tsconfig.
import { readFileSync } from "node:fs";
// @ts-expect-error Node test types are intentionally outside the browser-only tsconfig.
import test from "node:test";
import {
  audioLanguageOrder,
  originalLanguageForMeta,
  originalLanguageFromFind,
  resolveOriginalLanguage,
  usableOriginalLanguage,
} from "../src/lib/player/original-audio.ts";
import { pickBestTrack } from "../src/lib/subtitles/language.ts";

test("original language normalizes codes and ignores TMDB's no-language marker", () => {
  assert.equal(usableOriginalLanguage("JA"), "ja");
  assert.equal(usableOriginalLanguage("es"), "es");
  assert.equal(usableOriginalLanguage("xx"), null);
  assert.equal(usableOriginalLanguage(""), null);
  assert.equal(usableOriginalLanguage(undefined), null);
});

test("a TMDB find response yields the hit matching the title type", () => {
  const data = {
    movie_results: [{ original_language: "fr" }],
    tv_results: [{ original_language: "ko" }],
  };
  assert.equal(originalLanguageFromFind(data, "movie"), "fr");
  assert.equal(originalLanguageFromFind(data, "series"), "ko");
  assert.equal(
    originalLanguageFromFind({ tv_results: [{ original_language: "de" }] }, "movie"),
    "de",
  );
  assert.equal(originalLanguageFromFind({}, "movie"), null);
  assert.equal(originalLanguageFromFind(null, "movie"), null);
});

test("meta-carried and anime ids resolve without a network call", async () => {
  assert.equal(originalLanguageForMeta({ id: "tmdb:movie:1", originalLanguage: "es" }), "es");
  assert.equal(originalLanguageForMeta({ id: "kitsu:1", originalLanguage: undefined }), "ja");
  assert.equal(originalLanguageForMeta({ id: "tt0000001", originalLanguage: undefined }), null);
  assert.equal(await resolveOriginalLanguage({ id: "kitsu:1", type: "series" }, null, ""), "ja");
  assert.equal(await resolveOriginalLanguage({ id: "tt0000001", type: "movie" }, null, ""), null);
});

test("remembered pick leads, then the original language, then the user's list", () => {
  assert.deepEqual(audioLanguageOrder(["English", "Japanese"], null, null), [
    "English",
    "Japanese",
  ]);
  assert.deepEqual(audioLanguageOrder(["English"], null, "es"), ["es", "English"]);
  assert.deepEqual(audioLanguageOrder(["English", "es"], "English", "es"), ["English", "es"]);
});

test("a dubbed release lands on the original-language track", () => {
  const tracks = [
    { id: "1", lang: "eng", default: true },
    { id: "2", lang: "spa" },
  ];
  assert.equal(pickBestTrack(tracks, audioLanguageOrder(["English"], null, null))?.id, "1");
  assert.equal(pickBestTrack(tracks, audioLanguageOrder(["English"], null, "es"))?.id, "2");
  assert.equal(pickBestTrack(tracks, audioLanguageOrder(["English"], "eng", "es"))?.id, "1");
  const noOriginal = [{ id: "1", lang: "eng" }];
  assert.equal(pickBestTrack(noOriginal, audioLanguageOrder(["English"], null, "es"))?.id, "1");
});

test("autoload re-runs track selection once the original language resolves", () => {
  const hook = readFileSync(
    new URL("../src/views/player/hooks/use-track-autoload.ts", import.meta.url),
    "utf8",
  );
  assert.match(hook, /audioLanguageOrder\(baseAudio, prefs\?\.audioLang, originalAudioLang\)/);
  assert.match(hook, /settings\.trackBlockWords,\s*originalAudioLang,\s*\]\)/);
});
