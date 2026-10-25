import "./_localstorage-stub.ts";
// @ts-expect-error Node test types are intentionally outside the browser-only tsconfig.
import assert from "node:assert/strict";
// @ts-expect-error Node test types are intentionally outside the browser-only tsconfig.
import test from "node:test";
import { frameProfileId, type Profile, type ProfilesState } from "../src/lib/profiles.tsx";

function profile(id: string, extra: Partial<Profile> = {}): Profile {
  return {
    id,
    name: id,
    avatar: null,
    color: "#fff",
    isPrimary: false,
    shareStremioWith: null,
    passwordHash: null,
    hideContent: null,
    lockedTabs: null,
    kid: null,
    createdAt: 0,
    ...extra,
  };
}

const kid = { age: 7, curfewMinutes: null, parentPinHash: null };

test("the last active profile stays active", () => {
  const state: ProfilesState = {
    profiles: [profile("main", { isPrimary: true }), profile("second")],
    activeId: "second",
  };
  assert.equal(frameProfileId(state), "second");
});

test("a kid profile hands over to the primary profile", () => {
  const state: ProfilesState = {
    profiles: [profile("main", { isPrimary: true }), profile("child", { kid })],
    activeId: "child",
  };
  assert.equal(frameProfileId(state), "main");
});

test("a missing active profile falls back to the primary one", () => {
  const state: ProfilesState = {
    profiles: [profile("second"), profile("main", { isPrimary: true })],
    activeId: null,
  };
  assert.equal(frameProfileId(state), "main");
});
