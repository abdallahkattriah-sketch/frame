// TMDB release types (`/movie/{id}/release_dates`).
export const RELEASE_TYPE = {
  premiere: 1,
  theatricalLimited: 2,
  theatrical: 3,
  digital: 4,
  physical: 5,
  tv: 6,
} as const;

export const THEATRICAL_TYPES: readonly number[] = [
  RELEASE_TYPE.theatricalLimited,
  RELEASE_TYPE.theatrical,
];
export const DIGITAL_TYPES: readonly number[] = [RELEASE_TYPE.digital];

export type RadarSectionId = "coming" | "digital" | "new" | "popular";

export type RawReleaseDates = {
  results?: Array<{
    iso_3166_1?: string;
    release_dates?: Array<{ release_date?: string; type?: number; note?: string }>;
  }>;
};

export type RadarDate = {
  /** YYYY-MM-DD as TMDB lists it. */
  date: string;
  kind: "theatrical" | "digital";
  /** ISO 3166-1 country the date belongs to. */
  region: string;
};

export function isoDay(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

const DAY = 24 * 60 * 60 * 1000;

/**
 * `discover/movie` filters for a section. With `region` set, TMDB applies the
 * release-type and date filters to that country's release dates, so every result
 * has a listed release of that type there. Windows are deliberately wide: Coming
 * Soon has no upper bound and Newly Released reaches back six months.
 */
export function discoverParams(
  section: Exclude<RadarSectionId, "popular">,
  region: string,
  now: number,
): Record<string, string> {
  const today = isoDay(now);
  const base: Record<string, string> = {
    region,
    sort_by: "popularity.desc",
    include_adult: "false",
  };
  if (section === "coming") {
    return {
      ...base,
      with_release_type: THEATRICAL_TYPES.join("|"),
      "release_date.gte": isoDay(now + DAY),
    };
  }
  if (section === "new") {
    return {
      ...base,
      with_release_type: THEATRICAL_TYPES.join("|"),
      "release_date.gte": isoDay(now - 180 * DAY),
      "release_date.lte": today,
    };
  }
  return {
    ...base,
    with_release_type: DIGITAL_TYPES.join("|"),
    "release_date.gte": isoDay(now - 120 * DAY),
    "release_date.lte": isoDay(now + 60 * DAY),
  };
}

function datesOfTypes(raw: RawReleaseDates, country: string, types: readonly number[]): string[] {
  const entry = raw.results?.find((r) => r.iso_3166_1 === country);
  return (entry?.release_dates ?? [])
    .filter((d) => typeof d.type === "number" && types.includes(d.type) && d.release_date)
    .map((d) => d.release_date!.slice(0, 10))
    .sort();
}

/**
 * The date to show for a movie in a section, read only from TMDB's listed release
 * dates. The chosen region wins; otherwise the earliest matching date in any
 * country, labelled with that country. Returns null when nothing is listed, so the
 * UI shows no date rather than a guess.
 */
export function pickRadarDate(
  raw: RawReleaseDates | null,
  section: RadarSectionId,
  region: string,
  now: number,
): RadarDate | null {
  if (!raw?.results?.length) return null;
  const kind: RadarDate["kind"] = section === "digital" ? "digital" : "theatrical";
  const types = kind === "digital" ? DIGITAL_TYPES : THEATRICAL_TYPES;
  const today = isoDay(now);
  const choose = (dates: string[]): string | undefined => {
    if (section === "coming") return dates.find((d) => d > today);
    if (section === "new") return dates.filter((d) => d <= today).at(-1);
    return dates[0];
  };
  const local = choose(datesOfTypes(raw, region, types));
  if (local) return { date: local, kind, region };
  let best: RadarDate | null = null;
  for (const r of raw.results) {
    const country = r.iso_3166_1;
    if (!country || country === region) continue;
    const d = choose(datesOfTypes(raw, country, types));
    if (!d) continue;
    if (!best || d < best.date) best = { date: d, kind, region: country };
  }
  return best;
}

/** Followed people's titles first (keeping each group's order), then the rest. */
export function prioritizeFollowed<T extends { id: string }>(
  items: T[],
  followedIds: ReadonlySet<string>,
): T[] {
  const first: T[] = [];
  const rest: T[] = [];
  for (const it of items) (followedIds.has(it.id) ? first : rest).push(it);
  return [...first, ...rest];
}

/** Appends a page, dropping ids already shown. */
export function appendUnique<T extends { id: string }>(current: T[], next: T[]): T[] {
  const seen = new Set(current.map((m) => m.id));
  const out = current.slice();
  for (const m of next) {
    if (seen.has(m.id)) continue;
    seen.add(m.id);
    out.push(m);
  }
  return out;
}
