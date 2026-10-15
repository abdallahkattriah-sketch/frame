// @ts-expect-error Node test types are intentionally outside the browser-only tsconfig.
import assert from "node:assert/strict";
// @ts-expect-error Node test types are intentionally outside the browser-only tsconfig.
import test from "node:test";
import { dropOutvoted } from "../src/lib/skip-intro/consensus";
import type { SkipKind, SkipSegment, SkipSource } from "../src/lib/skip-intro/types";

const seg = (source: SkipSource, startSec: number, endSec: number, kind: SkipKind = "intro") =>
  ({ kind, startSec, endSec, source }) satisfies SkipSegment;

const kept = (lists: SkipSegment[][]) =>
  dropOutvoted(lists)
    .flat()
    .map((s) => s.source);

test("a top-priority intro two other sources contradict is dropped", () => {
  // Family Guy S6E6: SkipDB returns the S6E5 intro, TheIntroDB and introdb.app agree on the real one.
  const lists = [
    [seg("skipdb", 20.8, 52.3)],
    [seg("introdb", 0, 30.5)],
    [seg("introdb-app", 0.5, 31.5)],
  ];
  assert.deepEqual(kept(lists), ["introdb", "introdb-app"]);
});

test("an intro backed by a second source survives a lone dissenter", () => {
  const lists = [[seg("skipdb", 0, 31)], [seg("introdb", 0, 30)], [seg("introdb-app", 22, 52)]];
  assert.deepEqual(kept(lists), ["skipdb", "introdb"]);
});

test("a lone source and a single disagreeing source both stay for priority to decide", () => {
  const lists = [[seg("skipdb", 20, 50)], [seg("introdb", 0, 30)]];
  assert.deepEqual(kept(lists), ["skipdb", "introdb"]);
});

test("segments of other kinds and ads are never outvoted", () => {
  const lists = [
    [seg("adcorpus", 10, 40, "ad")],
    [seg("skipdb", 1200, 1260, "outro")],
    [seg("introdb", 0, 30), seg("introdb", 1220, 1270, "intro")],
    [seg("introdb-app", 0.5, 31)],
  ];
  assert.deepEqual(kept(lists), ["adcorpus", "skipdb", "introdb", "introdb", "introdb-app"]);
});
