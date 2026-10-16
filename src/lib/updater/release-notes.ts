import { safeFetch } from "@/lib/safe-fetch";
import { HARBOR_DATA_BASE } from "@/lib/config/endpoints";
import bundled from "./bundled-release-notes.json";

export type NoteMedia = {
  src: string;
  kind?: "image" | "sprite";
  alt?: string;
  height?: number;
};

export type NoteSection = { heading?: string; items: string[] };

export type ReleaseNote = {
  title?: string;
  intro?: string;
  media?: NoteMedia;
  sections?: NoteSection[];
};

const URL = `${HARBOR_DATA_BASE}/release-notes.json`;
const bundledNotes: Record<string, ReleaseNote> = bundled.notes;

let cache: Record<string, ReleaseNote> | null = null;
let loading: Promise<void> | null = null;

async function load(): Promise<void> {
  try {
    const res = await safeFetch(URL);
    const j = res.ok ? ((await res.json()) as { notes?: Record<string, ReleaseNote> }) : null;
    cache = j?.notes ?? {};
  } catch {
    cache = {};
  }
}

export async function releaseNote(version: string | null | undefined): Promise<ReleaseNote | null> {
  if (!version) return null;
  // Exact-version notes remain available offline and before feed publication.
  if (Object.hasOwn(bundledNotes, version)) return bundledNotes[version];
  if (!cache) {
    if (!loading) loading = load();
    await loading;
  }
  return cache?.[version] ?? null;
}

// Turns the release changelog ("### Group" headings over "- item" lines) into note sections.
export function noteFromMarkdown(markdown: string | null | undefined): ReleaseNote | null {
  const sections: NoteSection[] = [];
  for (const raw of (markdown ?? "").replace(/\r\n/g, "\n").split("\n")) {
    const line = raw.trim();
    const heading = /^#{2,4}\s+(.+)$/.exec(line);
    if (heading) sections.push({ heading: heading[1], items: [] });
    else if (/^[-*]\s+/.test(line)) {
      if (!sections.length) sections.push({ items: [] });
      sections[sections.length - 1].items.push(line.replace(/^[-*]\s+/, ""));
    }
  }
  const filled = sections.filter((s) => s.items.length > 0);
  return filled.length ? { sections: filled } : null;
}

export function hasRichNote(n: ReleaseNote | null | undefined): n is ReleaseNote {
  return !!n && !!(n.media || n.title || (n.sections && n.sections.length > 0));
}
