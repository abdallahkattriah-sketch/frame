import type { Meta } from "@/lib/cinemeta";
import type { FollowedPerson } from "@/lib/follows";
import { get } from "@/lib/providers/tmdb/tmdb-client";
import { movieMeta, type RawMovie } from "@/lib/providers/tmdb/tmdb-meta-mappers";
import {
  discoverParams,
  isoDay,
  pickRadarDate,
  type RadarDate,
  type RadarSectionId,
  type RawReleaseDates,
} from "./release-dates";

export type RadarItem = Meta & { radarDate: RadarDate | null; followed?: boolean };

export type RadarPage = { items: RadarItem[]; page: number; totalPages: number };

type DiscoverPage = { results?: RawMovie[]; page?: number; total_pages?: number };

const releaseDatesCache = new Map<number, Promise<RawReleaseDates | null>>();

function releaseDates(key: string, id: number): Promise<RawReleaseDates | null> {
  let hit = releaseDatesCache.get(id);
  if (!hit) {
    hit = get<RawReleaseDates>(key, `movie/${id}/release_dates`).catch(() => null);
    releaseDatesCache.set(id, hit);
  }
  return hit;
}

async function withDates(
  key: string,
  rows: RawMovie[],
  section: RadarSectionId,
  region: string,
  now: number,
): Promise<RadarItem[]> {
  const dated = await Promise.all(
    rows.map(async (m) => {
      const radarDate =
        section === "popular"
          ? null
          : pickRadarDate(await releaseDates(key, m.id), section, region, now);
      return { ...movieMeta(m), radarDate } as RadarItem;
    }),
  );
  // A section only lists titles TMDB gives a matching release date for.
  return section === "popular" ? dated : dated.filter((m) => m.radarDate);
}

export async function fetchRadarPage(
  key: string,
  section: RadarSectionId,
  region: string,
  page: number,
  now = Date.now(),
): Promise<RadarPage> {
  const data =
    section === "popular"
      ? await get<DiscoverPage>(key, "movie/popular", { region, page: String(page) })
      : await get<DiscoverPage>(key, "discover/movie", {
          ...discoverParams(section, region, now),
          page: String(page),
        });
  if (!data) throw new Error("tmdb-unavailable");
  const items = await withDates(key, data.results ?? [], section, region, now);
  return { items, page, totalPages: Math.min(data.total_pages ?? page, 500) };
}

type Credit = RawMovie & { job?: string; character?: string };
type CreditsPage = { cast?: Credit[]; crew?: Credit[] };

function creditsForRole(c: CreditsPage, role: FollowedPerson["role"]): Credit[] {
  const cast = c.cast ?? [];
  const directed = (c.crew ?? []).filter((m) => m.job === "Director");
  if (role === "acting") return cast;
  if (role === "directing") return directed;
  return [...cast, ...directed];
}

/**
 * Upcoming theatrical releases from followed people's TMDB credits. TMDB lists
 * announced films with or without dates; only those with a listed future
 * theatrical date are kept.
 */
export async function fetchFollowedUpcoming(
  key: string,
  people: FollowedPerson[],
  region: string,
  now = Date.now(),
): Promise<RadarItem[]> {
  const today = isoDay(now);
  const lists = await Promise.all(
    people.map((p) =>
      get<CreditsPage>(key, `person/${p.id}/movie_credits`)
        .then((c) => (c ? creditsForRole(c, p.role) : []))
        .catch(() => [] as Credit[]),
    ),
  );
  const seen = new Set<number>();
  const candidates: Credit[] = [];
  for (const m of lists.flat()) {
    if (seen.has(m.id) || !m.release_date || m.release_date <= today) continue;
    seen.add(m.id);
    candidates.push(m);
  }
  const items = await withDates(key, candidates, "coming", region, now);
  return items
    .map((m) => ({ ...m, followed: true }))
    .sort((a, b) => a.radarDate!.date.localeCompare(b.radarDate!.date));
}
