// @ts-expect-error Node test types are intentionally outside the browser-only tsconfig.
import assert from "node:assert/strict";
// @ts-expect-error Node test types are intentionally outside the browser-only tsconfig.
import test from "node:test";
import { absoluteNumberFor, distinctAbsolute, seasonOffsets } from "../src/lib/episode-absolute.ts";

test("offsets count regular episodes of earlier seasons and skip specials", () => {
  const offsets = seasonOffsets([
    [0, 5],
    [1, 12],
    [2, 10],
    [3, 8],
  ]);
  assert.equal(offsets.get(0), undefined);
  assert.equal(absoluteNumberFor(offsets, 1, 4), 4);
  assert.equal(absoluteNumberFor(offsets, 2, 1), 13);
  assert.equal(absoluteNumberFor(offsets, 3, 8), 30);
  assert.equal(absoluteNumberFor(offsets, 0, 2), undefined);
});

test("offsets follow season order regardless of input order", () => {
  const offsets = seasonOffsets([
    [3, 4],
    [1, 6],
    [2, 5],
  ]);
  assert.equal(absoluteNumberFor(offsets, 3, 1), 12);
});

test("seasons missing from the counts get no absolute number", () => {
  const offsets = seasonOffsets([[1, 10]]);
  assert.equal(absoluteNumberFor(offsets, 2, 1), undefined);
});

test("the label is only shown where the absolute number differs", () => {
  assert.equal(distinctAbsolute(5, 5), null);
  assert.equal(distinctAbsolute(17, 5), 17);
  assert.equal(distinctAbsolute(undefined, 5), null);
  assert.equal(distinctAbsolute(0, 5), null);
});
