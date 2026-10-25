import "./_localstorage-stub.ts";
// @ts-expect-error Node test types are intentionally outside the browser-only tsconfig.
import assert from "node:assert/strict";
// @ts-expect-error Node test types are intentionally outside the browser-only tsconfig.
import { readFileSync } from "node:fs";
// @ts-expect-error Node test types are intentionally outside the browser-only tsconfig.
import test from "node:test";
import { getSession as anilistSession } from "../src/lib/anilist/session.ts";
import { anilistRequest } from "../src/lib/anilist/client.ts";
import { getSession as malSession } from "../src/lib/mal/session.ts";
import { TrackerRemovedError } from "../src/lib/removed-trackers.ts";
import { getSession as simklSession } from "../src/lib/simkl/session.ts";
import { getSession as traktSession, isAuthenticated } from "../src/lib/trakt/session.ts";

test("removed trackers report no session even with a stored one", () => {
  localStorage.setItem(
    "harbor.settings",
    JSON.stringify({
      traktAccessToken: "a",
      traktRefreshToken: "r",
      traktExpiresAt: Date.now() + 3_600_000,
    }),
  );
  assert.equal(traktSession(), null);
  assert.equal(isAuthenticated(), false);
  assert.equal(simklSession(), null);
  assert.equal(anilistSession(), null);
  assert.equal(malSession(), null);
  // The stored token is left in place, not cleared.
  assert.ok(localStorage.getItem("harbor.settings")?.includes('"traktAccessToken":"a"'));
});

test("removed trackers send no requests", async () => {
  const realFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = (async () => {
    calls += 1;
    return new Response("{}");
  }) as typeof fetch;
  try {
    await assert.rejects(anilistRequest("query { Viewer { id } }"), TrackerRemovedError);
    assert.equal(calls, 0);
  } finally {
    globalThis.fetch = realFetch;
  }
});

// These clients declare constructor parameter properties, which Node cannot
// load without compiling, so their gate is checked in the source.
test("the Trakt, Simkl and MAL clients refuse before any request", () => {
  for (const [file, fn] of [
    ["trakt/client.ts", "traktRequest"],
    ["simkl/client.ts", "simklRequest"],
    ["mal/client.ts", "malRequest"],
  ]) {
    const src = readFileSync(new URL(`../src/lib/${file}`, import.meta.url), "utf8");
    const body = src.slice(src.indexOf(`function ${fn}<T>(`));
    const firstLine = body.slice(body.indexOf("{\n") + 2).split("\n")[0];
    assert.match(firstLine, /^\s+if \(TRACKERS_REMOVED\) (throw|return Promise\.reject\()/, file);
  }
});
