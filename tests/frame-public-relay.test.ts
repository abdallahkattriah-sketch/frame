// @ts-expect-error Node test types are intentionally outside the browser-only tsconfig.
import assert from "node:assert/strict";
// @ts-expect-error Node test types are intentionally outside the browser-only tsconfig.
import { readFileSync } from "node:fs";
// @ts-expect-error Node test types are intentionally outside the browser-only tsconfig.
import test from "node:test";
import { isPublicRelay } from "../src/lib/together/relay-version.ts";

test("only Harbor's public relay host counts as the public relay", () => {
  assert.equal(isPublicRelay("wss://pub.harbor.site"), true);
  assert.equal(isPublicRelay("wss://PUB.harbor.site/room"), true);
  assert.equal(isPublicRelay("wss://relay.example.workers.dev"), false);
  assert.equal(isPublicRelay(""), false);
});

test("Watch Together never dials the public relay", () => {
  for (const file of ["together/provider.tsx"]) {
    const src = readFileSync(new URL(`../src/lib/${file}`, import.meta.url), "utf8");
    assert.match(
      src,
      /const relayUrl = isPublicRelay\(settings\.togetherRelayUrl\) \? "" : settings\.togetherRelayUrl;/,
      file,
    );
  }
});
