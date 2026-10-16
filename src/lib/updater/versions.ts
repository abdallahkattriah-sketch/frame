import { safeFetch } from "@/lib/safe-fetch";
import { probeHandoff } from "./handoff";

const RELEASES_API = "https://api.github.com/repos/crazyrabbit0/harbor/releases?per_page=30";

export type VersionEntry = {
  version: string;
  date?: string;
  notes?: string;
  assets?: Record<string, string>;
};

type GitHubRelease = {
  tag_name?: string;
  draft?: boolean;
  published_at?: string;
  body?: string;
  assets?: { name?: string; browser_download_url?: string }[];
};

// Installer suffix per native platform key reported by handoff_probe.
const INSTALLER_SUFFIX: Record<string, string> = {
  "windows-x86_64": "_x64-setup.exe",
  "darwin-aarch64": "_aarch64.dmg",
  "darwin-x86_64": "_x64.dmg",
};

export const currentVersion = __APP_VERSION__;

export function versionFromRelease(release: GitHubRelease): VersionEntry | null {
  const version = /^v(\d+\.\d+\.\d+)$/.exec(release.tag_name ?? "")?.[1];
  if (!version || release.draft) return null;
  const assets: Record<string, string> = {};
  for (const [key, suffix] of Object.entries(INSTALLER_SUFFIX)) {
    const url = release.assets?.find((a) => a.name?.endsWith(suffix))?.browser_download_url;
    if (url) assets[key] = url;
  }
  return {
    version,
    date: release.published_at?.slice(0, 10),
    notes: changesOf(release.body ?? ""),
    assets,
  };
}

// The release body opens with a download table; the notes are the part under "## Changes".
function changesOf(body: string): string | undefined {
  const text = body.replace(/\r\n/g, "\n");
  const start = text.indexOf("## Changes");
  const notes = (start >= 0 ? text.slice(start + "## Changes".length) : text)
    .split("\n**Full changelog**")[0]
    .trim();
  return notes || undefined;
}

export async function fetchVersionHistory(): Promise<VersionEntry[]> {
  const [res, probe] = await Promise.all([
    safeFetch(RELEASES_API, {
      cache: "no-store",
      headers: { accept: "application/vnd.github+json" },
    }),
    probeHandoff(),
  ]);
  if (!res.ok) throw new Error(`history ${res.status}`);
  platformKey = probe?.platformKey ?? null;
  const data = (await res.json()) as unknown;
  if (!Array.isArray(data)) return [];
  return data
    .map((r) => versionFromRelease(r as GitHubRelease))
    .filter((v): v is VersionEntry => v !== null);
}

let platformKey: string | null = null;

export function installerUrl(entry: VersionEntry): string | null {
  return (platformKey && entry.assets?.[platformKey]) || null;
}
