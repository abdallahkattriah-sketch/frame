import { safeFetch } from "@/lib/safe-fetch";
import { probeHandoff } from "./handoff";

const RELEASES_API = "https://api.github.com/repos/crazyrabbit0/harbor/releases?per_page=30";
// The API allows 60 unauthenticated requests an hour per IP; the Atom feed has no such limit but lists only 10.
const RELEASES_FEED = "https://github.com/crazyrabbit0/harbor/releases.atom";

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

const ENTITIES: Record<string, string> = { lt: "<", gt: ">", quot: '"', apos: "'", amp: "&" };

function unescapeXml(text: string): string {
  return text.replace(/&(#\d+|lt|gt|quot|apos|amp);/g, (_, e: string) =>
    e.startsWith("#") ? String.fromCharCode(Number(e.slice(1))) : ENTITIES[e],
  );
}

// Turns a feed entry's HTML body back into the markdown shape the API returns.
function markdownFromHtml(html: string): string {
  const text = html
    .replace(/<h2>(.*?)<\/h2>/g, "\n## $1\n")
    .replace(/<h3>(.*?)<\/h3>/g, "\n### $1\n")
    .replace(/<li>(.*?)<\/li>\n?/g, "- $1\n")
    .replace(/<strong>Full changelog<\/strong>/g, "\n**Full changelog**")
    .replace(/<[^>]+>/g, "")
    .replace(/\n{3,}/g, "\n\n");
  return unescapeXml(text);
}

export function releasesFromFeed(xml: string): GitHubRelease[] {
  return [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].map(([, entry]) => {
    const html = unescapeXml(/<content type="html">([\s\S]*?)<\/content>/.exec(entry)?.[1] ?? "");
    return {
      tag_name: /<id>[^<]*\/([^/<]+)<\/id>/.exec(entry)?.[1],
      published_at: /<updated>([^<]+)<\/updated>/.exec(entry)?.[1],
      body: markdownFromHtml(html),
      assets: [...html.matchAll(/href="([^"]+\/releases\/download\/[^"]+)"/g)].map(([, url]) => ({
        name: url.slice(url.lastIndexOf("/") + 1),
        browser_download_url: url,
      })),
    };
  });
}

async function fetchReleases(): Promise<GitHubRelease[]> {
  const res = await safeFetch(RELEASES_API, {
    cache: "no-store",
    headers: { accept: "application/vnd.github+json" },
  }).catch(() => null);
  if (res?.ok) {
    const data = (await res.json()) as unknown;
    return Array.isArray(data) ? (data as GitHubRelease[]) : [];
  }
  const feed = await safeFetch(RELEASES_FEED, { cache: "no-store" });
  if (!feed.ok) throw new Error(`history ${res?.status ?? "offline"} / feed ${feed.status}`);
  return releasesFromFeed(await feed.text());
}

export async function fetchVersionHistory(): Promise<VersionEntry[]> {
  const [releases, probe] = await Promise.all([fetchReleases(), probeHandoff()]);
  platformKey = probe?.platformKey ?? null;
  return releases.map(versionFromRelease).filter((v): v is VersionEntry => v !== null);
}

let platformKey: string | null = null;

export function installerUrl(entry: VersionEntry): string | null {
  return (platformKey && entry.assets?.[platformKey]) || null;
}
