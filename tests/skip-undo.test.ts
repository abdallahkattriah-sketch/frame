import assert from "node:assert/strict";
import test from "node:test";
import { hookHarness } from "./helpers/hook-harness.ts";

function harness(
  position: { at: number },
  settings: Record<string, unknown>,
  onKeyListener: (fn: (e: any) => void) => void = () => {},
) {
  const segment = { kind: "intro", startSec: 10, endSec: 90, source: "chapters" };
  const window = {
    addEventListener: (type: string, fn: (e: any) => void) => {
      if (type === "keydown") onKeyListener(fn);
    },
    removeEventListener() {},
  };
  const h = hookHarness(
    "src/views/player/skip-pill-container.tsx",
    "SkipPillContainer",
    {
      "@/lib/hotkeys": {
        effectiveBinding: (id: string) => (id === "playerUndoSkip" ? "alt+k" : "k"),
        eventToBinding: (e: any) => e.key,
        isTypingTarget: () => false,
      },
      "@/lib/player/interaction-lock": { isPlayerInteractionLocked: () => false },
      "react/jsx-runtime": { jsx: (_type: any, props: any) => props },
      "@/lib/player/playback-clock": { usePlaybackPosition: () => position.at },
      "@/components/player/skip-pill": { SkipPill() {} },
      "@/views/big-picture/player/bp-skip-pill": { BpSkipPill() {} },
      "@/lib/skip-intro": {
        activeSegment: (_s: any, at: number) => (at >= 10 && at < 90 ? segment : null),
      },
      "@/lib/settings": {
        useSettings: () => ({
          settings: {
            nextEpisodeLeadSec: 0,
            showSkipButton: true,
            skipButtonHideSec: 0,
            ...settings,
          },
        }),
      },
    },
    { window },
  );
  return { h, segment };
}

test("a manual skip offers Undo, which seeks back and keeps the Skip button", () => {
  const position = { at: 20 };
  const seeks: number[] = [];
  const { h, segment } = harness(position, {});
  const args = { skipSegments: [segment], durationSec: 1800, onSkip: (s: number) => seeks.push(s) };
  let props = h.render(args);
  assert.equal(props.onUndo, undefined, "nothing to undo before a skip");
  props.onSkip();
  assert.deepEqual(seeks, [90]);
  position.at = 90;
  props = h.render(args);
  assert.equal(typeof props.onUndo, "function");
  props.onUndo();
  assert.deepEqual(seeks, [90, 20], "undo returns to where the skip was pressed");
  position.at = 20;
  props = h.render(args);
  assert.equal(props.onUndo, undefined, "undo is single-use");
  assert.equal(props.segment, segment, "the Skip button is offered again");
});

test("the skip hotkey skips the active segment and offers Undo", () => {
  const position = { at: 30 };
  const seeks: number[] = [];
  const listeners: Array<(e: any) => void> = [];
  const { h, segment } = harness(position, {}, (fn) => listeners.push(fn));
  const args = { skipSegments: [segment], durationSec: 1800, onSkip: (s: number) => seeks.push(s) };
  h.render(args);
  const press = (key: string) =>
    listeners.forEach((fn) =>
      fn({
        key,
        ctrlKey: false,
        shiftKey: false,
        altKey: false,
        metaKey: false,
        repeat: false,
        target: null,
        preventDefault() {},
      }),
    );
  press("j");
  assert.deepEqual(seeks, [], "other keys do nothing");
  press("alt+k");
  assert.deepEqual(seeks, [], "undo does nothing before a skip");
  press("k");
  assert.deepEqual(seeks, [90]);
  position.at = 90;
  assert.equal(typeof h.render(args).onUndo, "function");
  press("alt+k");
  assert.deepEqual(seeks, [90, 30], "the undo hotkey jumps back");
  position.at = 30;
  assert.equal(h.render(args).onUndo, undefined, "the undo hotkey is single-use");
});

test("an auto-skip also offers Undo", () => {
  const position = { at: 0 };
  const seeks: number[] = [];
  const { h, segment } = harness(position, { autoSkipIntro: true });
  const args = { skipSegments: [segment], durationSec: 1800, onSkip: (s: number) => seeks.push(s) };
  h.render(args);
  position.at = 12;
  h.render(args);
  assert.deepEqual(seeks, [90]);
  position.at = 90;
  const props = h.render(args);
  props.onUndo();
  assert.deepEqual(seeks, [90, 12]);
});
