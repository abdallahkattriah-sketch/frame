// @ts-expect-error Node test types are intentionally outside the browser-only tsconfig.
import assert from "node:assert/strict";
// @ts-expect-error Node test types are intentionally outside the browser-only tsconfig.
import test from "node:test";
import {
  anyTabLocked,
  DEFAULT_HIDDEN,
  LOCKABLE_TABS,
  type HiddenTabs,
} from "../src/lib/lockable-tabs.ts";

test("a saved restriction on a tab that is no longer lockable does not lock a profile", () => {
  const savedTabs = { ...DEFAULT_HIDDEN, retiredTab: true } as HiddenTabs;
  assert.equal(anyTabLocked(savedTabs), false);
  assert.equal(anyTabLocked(DEFAULT_HIDDEN), false);
  assert.equal(anyTabLocked(null), false);
});

test("every lockable tab, Sports included, locks a profile on its own", () => {
  assert.ok(LOCKABLE_TABS.some(({ key }) => key === "sports"));
  for (const { key } of LOCKABLE_TABS) {
    assert.equal(anyTabLocked({ ...DEFAULT_HIDDEN, [key]: true }), true, key);
  }
});
