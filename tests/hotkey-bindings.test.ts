// @ts-expect-error Node test types are intentionally outside the browser-only tsconfig.
import assert from "node:assert/strict";
// @ts-expect-error Node test types are intentionally outside the browser-only tsconfig.
import test from "node:test";
import {
  HOTKEYS,
  bindingsOverlap,
  digitFromEvent,
  digitModifier,
  effectiveBinding,
  eventToBinding,
  formatHotkeyBinding,
  sharesKeys,
} from "../src/lib/hotkeys.ts";

function key(k: string, init: Partial<KeyboardEvent> = {}): KeyboardEvent {
  return {
    key: k,
    code: "",
    ctrlKey: false,
    shiftKey: false,
    altKey: false,
    metaKey: false,
    ...init,
  } as KeyboardEvent;
}

test("Shift is part of a letter binding and Caps Lock is not", () => {
  assert.equal(eventToBinding(key("k")), "k");
  assert.equal(eventToBinding(key("K", { shiftKey: true })), "shift+k");
  assert.equal(
    eventToBinding(key("K")),
    "k",
    "Caps Lock alone gives an uppercase key without Shift",
  );
  assert.equal(eventToBinding(key("S", { ctrlKey: true, shiftKey: true })), "ctrl+shift+s");
  assert.equal(eventToBinding(key("<", { shiftKey: true })), "shift+<");
});

test("digit groups store a modifier and match any digit with it", () => {
  assert.equal(digitModifier(key("7", { code: "Digit7" })), "none");
  assert.equal(digitModifier(key("3", { code: "Digit3", ctrlKey: true })), "ctrl");
  assert.equal(digitModifier(key("#", { code: "Digit3", shiftKey: true })), "shift");
  assert.equal(digitModifier(key("Delete")), "off");
  assert.equal(digitModifier(key("Control", { ctrlKey: true })), null);

  assert.equal(digitFromEvent(key("5", { code: "Digit5" }), "none"), 5);
  assert.equal(digitFromEvent(key("5", { code: "Digit5", ctrlKey: true }), "none"), null);
  assert.equal(digitFromEvent(key("2", { code: "Digit2", ctrlKey: true }), "ctrl"), 2);
  assert.equal(digitFromEvent(key("@", { code: "Digit2", shiftKey: true }), "shift"), 2);
  assert.equal(digitFromEvent(key("2", { code: "Digit2" }), "off"), null);
  assert.equal(formatHotkeyBinding("playerJumpDigits", "none"), "0-9");
  assert.equal(formatHotkeyBinding("globalRoomDigits", "ctrl"), "Ctrl + 1-9");
});

test("digit matching reads modifiers from real events, whose fields are prototype getters", () => {
  class FakeKeyboardEvent {
    init: Partial<KeyboardEvent>;
    constructor(init: Partial<KeyboardEvent>) {
      this.init = init;
    }
    get key() {
      return this.init.key ?? "";
    }
    get code() {
      return this.init.code ?? "";
    }
    get ctrlKey() {
      return this.init.ctrlKey ?? false;
    }
    get shiftKey() {
      return this.init.shiftKey ?? false;
    }
    get altKey() {
      return this.init.altKey ?? false;
    }
    get metaKey() {
      return this.init.metaKey ?? false;
    }
  }
  const ctrl1 = new FakeKeyboardEvent({
    key: "1",
    code: "Digit1",
    ctrlKey: true,
  }) as unknown as KeyboardEvent;
  assert.equal(digitFromEvent(ctrl1, "none"), null, "Ctrl+1 is not a plain 1");
  assert.equal(digitFromEvent(ctrl1, "ctrl"), 1);
  assert.equal(digitModifier(ctrl1), "ctrl");
});

test("Global keys share the player's key space, Manga keys do not", () => {
  assert.equal(sharesKeys("Global", "Player"), true);
  assert.equal(sharesKeys("Manga", "Player"), false);
  assert.equal(bindingsOverlap("globalRoomDigits", "ctrl", "globalUiScaleReset", "ctrl+0"), false);
  assert.equal(bindingsOverlap("globalRoomDigits", "ctrl", "playerStats", "ctrl+3"), true);
  assert.equal(bindingsOverlap("playerJumpDigits", "none", "playerStats", "i"), false);
});

test("a key the user gave another action is not also claimed by a default", () => {
  const overrides = { playerScreenshot: "t" };
  assert.equal(effectiveBinding("playerScreenshot", overrides), "t");
  assert.equal(effectiveBinding("playerChatCompose", overrides), "");
  assert.equal(effectiveBinding("playerChatCompose", {}), "t");
  assert.equal(effectiveBinding("mangaFullscreen", { playerFullscreen: "g" }), "f");
  // One digit bound elsewhere must not switch off the other nine jumps.
  assert.equal(effectiveBinding("playerJumpDigits", { playerScreenshot: "5" }), "none");
});

test("no two default bindings collide where both are live", () => {
  const live = HOTKEYS.filter((h) => h.defaultBinding);
  const clashes: string[] = [];
  for (const [i, a] of live.entries()) {
    for (const b of live.slice(i + 1)) {
      if (!sharesKeys(a.scope, b.scope)) continue;
      if (bindingsOverlap(a.id, a.defaultBinding, b.id, b.defaultBinding))
        clashes.push(`${a.id} / ${b.id}`);
    }
  }
  assert.deepEqual(clashes, []);
});
