import "./_localstorage-stub.ts";
// @ts-expect-error Node test types are intentionally outside the browser-only tsconfig.
import assert from "node:assert/strict";
// @ts-expect-error Node test types are intentionally outside the browser-only tsconfig.
import test from "node:test";
import {
  applyBackup,
  backupFileName,
  BACKUP_IMPORT_EXTENSIONS,
  buildBackup,
  parseBackup,
} from "../src/lib/backup.ts";
import {
  isHarborStyleName,
  parseHarborStyle,
  serializeHarborStyle,
} from "../src/lib/harborstyle.ts";
import { THEME_PRESETS } from "../src/lib/theme.ts";

// The shape Harbor 0.9.x wrote into `.harbx` files.
const LEGACY_HARBX = JSON.stringify({
  format: "harbor-backup",
  version: 1,
  app: "0.9.219",
  exportedAt: "2026-10-01T10:00:00.000Z",
  data: {
    "harbor.watchlist.v1.default": '[{"id":"tt0111161"}]',
    "harbor.update.channel": "beta",
    "not-harbor": "x",
  },
  sections: ["watchlist"],
});

test("new backups are named frame-backup-YYYY-MM-DD.framex", () => {
  assert.equal(backupFileName(new Date("2026-10-23T18:00:00Z")), "frame-backup-2026-10-23.framex");
  assert.deepEqual([...BACKUP_IMPORT_EXTENSIONS], ["framex", "harbx"]);
});

test("a legacy .harbx backup parses and keeps only portable keys", () => {
  const parsed = parseBackup(LEGACY_HARBX);
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;
  assert.deepEqual(Object.keys(parsed.backup.data), ["harbor.watchlist.v1.default"]);
  assert.deepEqual(parsed.backup.sections, ["watchlist"]);
});

test("malformed and foreign files are rejected", () => {
  assert.deepEqual(parseBackup("{not json"), { ok: false, error: "That file is not valid JSON." });
  assert.equal(parseBackup(JSON.stringify({ format: "other", data: {} })).ok, false);
  assert.equal(parseBackup(JSON.stringify({ format: "harbor-backup", data: {} })).ok, false);
});

test("a Frame backup round-trips through export, parse and restore", async () => {
  localStorage.clear();
  localStorage.setItem("harbor.search.recent.default", '["dune"]');
  const backup = await buildBackup(["searchHistory"]);
  const parsed = parseBackup(JSON.stringify(backup));
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;
  localStorage.clear();
  await applyBackup(parsed.backup);
  assert.equal(localStorage.getItem("harbor.search.recent.default"), '["dune"]');
});

test("theme files export as Frame Style and import from both extensions", () => {
  assert.equal(isHarborStyleName("dracula.framestyle"), true);
  assert.equal(isHarborStyleName("dracula.harborstyle"), true);
  assert.equal(isHarborStyleName("dracula.framestyle.txt"), true);
  assert.equal(isHarborStyleName("dracula.json"), false);
  const text = serializeHarborStyle(THEME_PRESETS.frame);
  assert.ok(text.startsWith("# Frame Style\n"));
  const back = parseHarborStyle(text);
  assert.equal(back.ok, true);
  if (back.ok) assert.deepEqual(back.theme.tokens, THEME_PRESETS.frame.tokens);
  const legacy = parseHarborStyle(text.replace("# Frame Style", "# Harbor Style"));
  assert.equal(legacy.ok, true);
});
