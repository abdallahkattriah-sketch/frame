// @ts-expect-error Node test types are intentionally outside the browser-only tsconfig.
import assert from "node:assert/strict";
// @ts-expect-error Node test types are intentionally outside the browser-only tsconfig.
import test from "node:test";
import { toSegment } from "../src/lib/skip-intro/skipdb";

// SkipDB's answer for Family Guy S4E27 when queried with a 1314s WEBRip duration.
const shifted = (start_ms: number, end_ms: number) => ({
  start_ms,
  end_ms,
  adjusted: true,
  offset_ms: -10300,
  match: "shifted",
  confidence: 0.82,
});

test("a duration-shifted SkipDB intro keeps the episode's real timings", () => {
  const seg = toSegment(shifted(-10300, 20700), "intro");
  assert.deepEqual(seg && [seg.startSec, seg.endSec], [0, 31]);
});

test("a duration-shifted SkipDB outro keeps the episode's real timings", () => {
  const seg = toSegment(shifted(1267800, 1314000), "outro");
  assert.deepEqual(seg && [seg.startSec, seg.endSec], [1278.1, 1324.3]);
});

test("an offset SkipDB did not apply leaves the timings untouched", () => {
  const seg = toSegment(
    { start_ms: 0, end_ms: 31000, adjusted: false, offset_ms: 10900, match: "shifted" },
    "intro",
  );
  assert.deepEqual(seg && [seg.startSec, seg.endSec], [0, 31]);
});

test("an exact SkipDB match is used as returned", () => {
  const seg = toSegment(
    { start_ms: 0, end_ms: 31000, adjusted: false, offset_ms: 0, match: "exact", confidence: 0.9 },
    "intro",
  );
  assert.deepEqual(seg && [seg.startSec, seg.endSec, seg.source], [0, 31, "skipdb"]);
});
