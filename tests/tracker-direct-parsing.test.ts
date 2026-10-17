// @ts-expect-error Node test types are intentionally outside the browser-only tsconfig.
import assert from "node:assert/strict";
// @ts-expect-error Node test types are intentionally outside the browser-only tsconfig.
import test from "node:test";
import { parseSimklRating, simklRatingsUrl } from "../src/lib/simkl/ratings-url.ts";
import { extractAnilistToken } from "../src/lib/anilist/token-input.ts";
import { extractMalCode, extractMalState } from "../src/lib/mal/code-input.ts";

const app = {
  base: "https://api.simkl.com",
  clientId: "cid",
  appName: "harbor",
  appVersion: "1.0.0",
};

test("Simkl ratings go to api.simkl.com/ratings with one ID per request", () => {
  const url = new URL(simklRatingsUrl("imdb:tt0111161", app) ?? "");
  assert.equal(url.origin + url.pathname, "https://api.simkl.com/ratings");
  assert.equal(url.searchParams.get("imdb"), "tt0111161");
  assert.equal(url.searchParams.get("fields"), "simkl");
  assert.equal(url.searchParams.get("client_id"), "cid");
  assert.equal(new URL(simklRatingsUrl("mal:5114", app) ?? "").searchParams.get("mal"), "5114");
  assert.equal(simklRatingsUrl("nonsense", app), null);
  assert.equal(simklRatingsUrl("imdb:", app), null);
});

test("Simkl rating responses parse, and a null match yields no score", () => {
  assert.equal(parseSimklRating({ id: 1, simkl: { rating: 9.1, votes: 10 } }), 9.1);
  assert.equal(parseSimklRating(null), null);
  assert.equal(parseSimklRating({ id: 1 }), null);
});

test("AniList tokens are read from the pin page text or the redirect URL", () => {
  const jwt = "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.payload.signature";
  assert.deepEqual(extractAnilistToken(` ${jwt} `), { token: jwt, expiresInSec: 31536000 });
  const url = `https://anilist.co/api/v2/oauth/pin#access_token=${jwt}&token_type=Bearer&expires_in=100`;
  assert.deepEqual(extractAnilistToken(url), { token: jwt, expiresInSec: 100 });
  assert.equal(extractAnilistToken("short"), null);
});

test("MAL codes and state are read from the pasted redirect URL", () => {
  const pasted = "http://localhost:47321/harbor-mal?code=abc123&state=xyz";
  assert.equal(extractMalCode(pasted), "abc123");
  assert.equal(extractMalState(pasted), "xyz");
  assert.equal(extractMalCode("abc123"), "abc123");
  assert.equal(extractMalState("abc123"), null);
});
