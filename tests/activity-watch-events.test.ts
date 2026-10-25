// @ts-expect-error Node test types are intentionally outside the browser-only tsconfig.
import assert from "node:assert/strict";
// @ts-expect-error Node test types are intentionally outside the browser-only tsconfig.
import { readFileSync } from "node:fs";
// @ts-expect-error Node test types are intentionally outside the browser-only tsconfig.
import test from "node:test";

const read = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");

const autosave = read("src/views/player/hooks/use-resume-autosave.ts");
const marker = read("src/lib/mark-watched.ts");
const store = read("src/lib/watch-events.ts");

test("finishing playback records a watch event for every content type", () => {
  assert.match(autosave, /if \(finished\) \{\s*recordWatchEvent\(/);
  const guard = autosave.slice(
    autosave.indexOf("if (finished) {"),
    autosave.indexOf("const animeLocal"),
  );
  assert.doesNotMatch(guard, /meta\.type === "series" &&/, "must not be limited to one media type");
});

test("mark as watched records an event for both movies and shows", () => {
  const hits = marker.match(/recordWatchEvent\(/g) ?? [];
  assert.ok(hits.length >= 2, `expected movie and series paths, found ${hits.length}`);
  assert.match(marker, /recordWatchEvent\(\{\s*id: meta\.id,\s*type: "movie"/);
  assert.match(marker, /recordWatchEvent\(\{\s*id: meta\.id,\s*type: "series"/);
});

test("the watch log is capped and survives unreadable storage", () => {
  assert.match(store, /const MAX = \d+;/);
  assert.match(store, /\.slice\(0, MAX\)/, "the log must be bounded");
  assert.match(store, /catch \{\s*return \[\];/, "a corrupt log must not throw");
});

test("re-finishing the same episode replaces rather than duplicates", () => {
  assert.match(store, /filter\(\(p\) =>[\s\S]*?!== key\)/);
  assert.match(store, /\$\{e\.id\}\|\$\{e\.season \?\? ""\}\|\$\{e\.episode \?\? ""\}/);
});
