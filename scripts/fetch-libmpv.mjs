import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const SHA256 = "f2e18b3d4226fe09d54970a9ba1ee89559445a614addc260aa7c911389734ca1";
// Tried in order; the shinchiro archive is the unmodified mpv-dev build the DLL came from.
const SOURCES = process.env.HARBOR_LIBMPV_URL
  ? [process.env.HARBOR_LIBMPV_URL]
  : [
      "https://github.com/crazyrabbit0/harbor-deps/releases/download/libmpv-f2e18b3d4226/libmpv-2.dll",
      "https://github.com/shinchiro/mpv-winbuild-cmake/releases/download/20261020/mpv-dev-x86_64-20261020-git-6a262d11f6.7z",
    ];

const script = fileURLToPath(import.meta.url);
const root = join(dirname(script), "..");
const dest = join(root, "src-tauri", "libmpv", "libmpv-2.dll");
const digest = (buf) => createHash("sha256").update(buf).digest("hex");

function findFile(dir, name) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      const found = findFile(path, name);
      if (found) return found;
    } else if (entry.name === name) return path;
  }
  return null;
}

function dllFrom(url, buf) {
  if (!url.endsWith(".7z")) return buf;
  const temp = mkdtempSync(join(tmpdir(), "harbor-libmpv-"));
  try {
    const archive = join(temp, "mpv-dev.7z");
    writeFileSync(archive, buf);
    execFileSync("7z", ["x", "-y", archive, `-o${temp}`], { stdio: "ignore" });
    const dll = findFile(temp, "libmpv-2.dll");
    if (!dll) throw new Error("libmpv-2.dll not found in the archive");
    return readFileSync(dll);
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
}

// Repins this script to shinchiro's newest mpv-dev build; the DLL still has to be uploaded to harbor-deps.
async function pinLatest() {
  const res = await fetch(
    "https://api.github.com/repos/shinchiro/mpv-winbuild-cmake/releases/latest",
    { headers: { accept: "application/vnd.github+json" } },
  );
  if (!res.ok) throw new Error(`release lookup failed (${res.status} ${res.statusText})`);
  const release = await res.json();
  const asset = release.assets.find((a) => /^mpv-dev-x86_64-\d+-git-[0-9a-f]+\.7z$/.test(a.name));
  if (!asset) throw new Error(`no mpv-dev-x86_64 archive in ${release.tag_name}`);
  console.log(`[libmpv] fetching ${asset.browser_download_url}`);
  const download = await fetch(asset.browser_download_url, { redirect: "follow" });
  if (!download.ok) throw new Error(`download failed (${download.status} ${download.statusText})`);
  const buf = dllFrom(asset.name, Buffer.from(await download.arrayBuffer()));
  const sha = digest(buf);
  const tag = `libmpv-${sha.slice(0, 12)}`;
  const source = readFileSync(script, "utf8");
  const pinned = source
    .replace(/^const SHA256 = "[0-9a-f]{64}";/m, `const SHA256 = "${sha}";`)
    .replace(
      /"https:\/\/github\.com\/crazyrabbit0\/harbor-deps\/releases\/download\/libmpv-[0-9a-f]+\/libmpv-2\.dll"/,
      `"https://github.com/crazyrabbit0/harbor-deps/releases/download/${tag}/libmpv-2.dll"`,
    )
    .replace(
      /"https:\/\/github\.com\/shinchiro\/mpv-winbuild-cmake\/releases\/download\/[^"]+\.7z"/,
      `"${asset.browser_download_url}"`,
    );
  if (pinned.includes(SHA256) && sha !== SHA256) throw new Error("could not rewrite the pin");
  writeFileSync(script, pinned);
  mkdirSync(dirname(dest), { recursive: true });
  writeFileSync(dest, buf);
  console.log(`[libmpv] pinned ${asset.name} (SHA-256 ${sha}) and wrote ${dest}`);
  console.log(
    `[libmpv] publish it: gh release create ${tag} "${dest}" --repo crazyrabbit0/harbor-deps`,
  );
}

if (process.argv.includes("--latest")) {
  try {
    await pinLatest();
    process.exit(0);
  } catch (e) {
    console.error(`[libmpv] ${e instanceof Error ? e.message : e}`);
    process.exit(1);
  }
}

if (process.platform !== "win32" && !process.env.HARBOR_LIBMPV_FORCE) {
  console.log("[libmpv] not Windows, skipping (mac and linux link system libmpv)");
  process.exit(0);
}

if (existsSync(dest) && digest(readFileSync(dest)) === SHA256) {
  console.log("[libmpv] libmpv-2.dll already present and verified");
  process.exit(0);
}

for (const url of SOURCES) {
  console.log(`[libmpv] fetching ${url}`);
  try {
    const res = await fetch(url, { redirect: "follow" });
    if (!res.ok) throw new Error(`download failed (${res.status} ${res.statusText})`);
    const buf = dllFrom(url, Buffer.from(await res.arrayBuffer()));
    const got = digest(buf);
    if (got !== SHA256) throw new Error(`checksum mismatch (expected ${SHA256}, got ${got})`);
    mkdirSync(dirname(dest), { recursive: true });
    writeFileSync(dest, buf);
    console.log(`[libmpv] wrote ${dest} (${(buf.length / 1048576).toFixed(1)} MB)`);
    process.exit(0);
  } catch (e) {
    console.error(`[libmpv] ${e instanceof Error ? e.message : e}`);
  }
}
console.error(
  "[libmpv] set HARBOR_LIBMPV_URL to a mirror, or drop libmpv-2.dll into src-tauri/libmpv/",
);
process.exit(1);
