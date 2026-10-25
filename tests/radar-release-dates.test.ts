// @ts-expect-error Node test types are intentionally outside the browser-only tsconfig.
import assert from "node:assert/strict";
// @ts-expect-error Node test types are intentionally outside the browser-only tsconfig.
import test from "node:test";
import {
  appendUnique,
  discoverParams,
  pickRadarDate,
  prioritizeFollowed,
  type RawReleaseDates,
} from "../src/lib/radar/release-dates.ts";

const NOW = Date.UTC(2026, 9, 25, 12);

const raw: RawReleaseDates = {
  results: [
    {
      iso_3166_1: "EG",
      release_dates: [
        { release_date: "2026-11-12T00:00:00.000Z", type: 3 },
        { release_date: "2026-08-01T00:00:00.000Z", type: 3 },
        { release_date: "2026-12-20T00:00:00.000Z", type: 4 },
      ],
    },
    {
      iso_3166_1: "US",
      release_dates: [
        { release_date: "2026-11-05T00:00:00.000Z", type: 3 },
        { release_date: "2026-10-01T00:00:00.000Z", type: 4 },
      ],
    },
    { iso_3166_1: "FR", release_dates: [{ release_date: "2026-11-01T00:00:00.000Z", type: 2 }] },
  ],
};

test("Coming Soon takes the region's next theatrical date", () => {
  assert.deepEqual(pickRadarDate(raw, "coming", "EG", NOW), {
    date: "2026-11-12",
    kind: "theatrical",
    region: "EG",
  });
});

test("Newly Released takes the region's latest past theatrical date", () => {
  assert.deepEqual(pickRadarDate(raw, "new", "EG", NOW), {
    date: "2026-08-01",
    kind: "theatrical",
    region: "EG",
  });
});

test("Digital dates come only from digital releases", () => {
  assert.deepEqual(pickRadarDate(raw, "digital", "EG", NOW), {
    date: "2026-12-20",
    kind: "digital",
    region: "EG",
  });
});

test("without a regional date the earliest other country is labelled with its code", () => {
  assert.deepEqual(pickRadarDate(raw, "coming", "DE", NOW), {
    date: "2026-11-01",
    kind: "theatrical",
    region: "FR",
  });
});

test("no listed date gives null instead of a guess", () => {
  assert.equal(pickRadarDate({ results: [] }, "coming", "EG", NOW), null);
  assert.equal(pickRadarDate(null, "new", "EG", NOW), null);
  const onlyPremiere = {
    results: [{ iso_3166_1: "EG", release_dates: [{ release_date: "2026-12-01", type: 1 }] }],
  };
  assert.equal(pickRadarDate(onlyPremiere, "coming", "EG", NOW), null);
});

test("Coming Soon has no upper date bound and Newly Released is wider than 30 days", () => {
  const coming = discoverParams("coming", "EG", NOW);
  assert.equal(coming.region, "EG");
  assert.equal(coming["release_date.lte"], undefined);
  assert.equal(coming["release_date.gte"], "2026-10-26");
  const fresh = discoverParams("new", "EG", NOW);
  assert.equal(fresh["release_date.lte"], "2026-10-25");
  assert.ok(fresh["release_date.gte"] < "2026-09-25");
  assert.equal(discoverParams("digital", "EG", NOW).with_release_type, "4");
});

test("followed titles move to the front and pages append without duplicates", () => {
  const items = [{ id: "a" }, { id: "b" }, { id: "c" }];
  assert.deepEqual(
    prioritizeFollowed(items, new Set(["c"])).map((m) => m.id),
    ["c", "a", "b"],
  );
  assert.deepEqual(
    appendUnique(items, [{ id: "b" }, { id: "d" }]).map((m) => m.id),
    ["a", "b", "c", "d"],
  );
});
