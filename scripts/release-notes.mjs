#!/usr/bin/env node
// `node scripts/release-notes.mjs <from-ref> <to-ref>` prints a markdown changelog of the commits between them.
import { execFileSync } from "node:child_process";

const [from, to = "HEAD"] = process.argv.slice(2);
if (!from) {
  console.error("usage: node scripts/release-notes.mjs <from-ref> [to-ref]");
  process.exit(1);
}

const log = execFileSync("git", ["log", "--no-merges", "--format=%s", `${from}..${to}`], {
  encoding: "utf8",
});

const GROUPS = [
  ["Features", /^feat$/],
  ["Fixes", /^fix$/],
  ["Performance", /^perf$/],
  ["Documentation", /^docs$/],
  ["Build and CI", /^(ci|build)$/],
  ["Other", /.*/],
];
const sections = new Map(GROUPS.map(([name]) => [name, []]));

for (const subject of log
  .split("\n")
  .map((s) => s.trim())
  .filter(Boolean)) {
  if (subject.startsWith("chore(release)")) continue;
  const match = subject.match(/^(\w+)(?:\(([^)]+)\))?!?:\s*(.+)$/);
  const type = match ? match[1] : "";
  const scope = match?.[2];
  const text = match ? match[3] : subject;
  const line = `${text.charAt(0).toUpperCase()}${text.slice(1)}${scope ? ` (${scope})` : ""}`;
  const [name] = GROUPS.find(([, re]) => re.test(type));
  sections.get(name).push(line);
}

const out = [];
for (const [name, lines] of sections) {
  if (!lines.length) continue;
  out.push(`### ${name}`, "", ...lines.map((l) => `- ${l}`), "");
}
console.log(out.length ? out.join("\n").trimEnd() : "No changes since the previous release.");
