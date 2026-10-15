import { kitsuToTvdb } from "./anime-mapping";
import { tvdbGet } from "./tvdb";

export type TvdbImageMap = Record<string, string>;

export type TvdbArtwork = { backgrounds: string[]; clearLogos: string[]; posters: string[] };

type RawArtwork = {
  image?: string | null;
  type?: number;
  language?: string | null;
  score?: number;
};
type RawEpisode = {
  number?: number;
  seasonNumber?: number;
  absoluteNumber?: number;
  image?: string | null;
};
type RemoteHit = { series?: { id?: number } | null; movie?: { id?: number } | null };

// TVDB artwork type ids: series 2/3/23, movie 14/15/25 (poster, background, clear logo).
const ART_KINDS: Record<number, keyof TvdbArtwork> = {
  2: "posters",
  3: "backgrounds",
  23: "clearLogos",
  14: "posters",
  15: "backgrounds",
  25: "clearLogos",
};

const ORDER_SLUG: Record<string, string> = {
  default: "default",
  aired: "default",
  official: "default",
  absolute: "default",
  tvdbabsolute: "absolute",
};

function img(v: string | null | undefined): string | null {
  if (!v) return null;
  return v.startsWith("http")
    ? v
    : `https://artworks.thetvdb.com${v.startsWith("/") ? "" : "/"}${v}`;
}

async function resolveTarget(opts: {
  imdb?: string | null;
  kitsuId?: number | null;
  series?: number | null;
}): Promise<{ kind: "series" | "movies"; id: number } | null> {
  if (opts.series) return { kind: "series", id: opts.series };
  if (opts.kitsuId != null) {
    const series = await kitsuToTvdb(opts.kitsuId).catch(() => null);
    if (series) return { kind: "series", id: series };
  }
  if (!opts.imdb || !opts.imdb.startsWith("tt")) return null;
  const res = await tvdbGet<RemoteHit[]>(`/search/remoteid/${opts.imdb}`);
  for (const row of res.data ?? []) {
    if (row.series?.id) return { kind: "series", id: row.series.id };
  }
  for (const row of res.data ?? []) {
    if (row.movie?.id) return { kind: "movies", id: row.movie.id };
  }
  return null;
}

function rankArt(a: RawArtwork, b: RawArtwork): number {
  const lang = (x: RawArtwork) => (x.language === "eng" ? 0 : x.language == null ? 1 : 2);
  return lang(a) - lang(b) || (b.score ?? 0) - (a.score ?? 0);
}

export async function fetchTvdbArtwork(opts: {
  imdb?: string | null;
  kitsuId?: number | null;
  series?: number | null;
}): Promise<TvdbArtwork> {
  const out: TvdbArtwork = { backgrounds: [], clearLogos: [], posters: [] };
  const target = await resolveTarget(opts);
  if (!target) return out;
  const res = await tvdbGet<{ artworks?: RawArtwork[] }>(`/${target.kind}/${target.id}/extended`);
  const arts = [...(res.data?.artworks ?? [])].sort(rankArt);
  for (const a of arts) {
    const kind = a.type != null ? ART_KINDS[a.type] : undefined;
    const url = img(a.image);
    if (kind && url && out[kind].length < 20) out[kind].push(url);
  }
  return out;
}

export async function fetchTvdbProxyImages(opts: {
  imdb?: string | null;
  kitsuId?: number | null;
  series?: number | null;
  type?: string;
}): Promise<TvdbImageMap> {
  const target = await resolveTarget(opts);
  if (!target || target.kind !== "series") return {};
  const slug = ORDER_SLUG[opts.type ?? "default"] ?? opts.type ?? "default";
  const map: TvdbImageMap = {};
  for (let page = 0; page < 20; page++) {
    const res = await tvdbGet<{ episodes?: RawEpisode[] }>(
      `/series/${target.id}/episodes/${slug}?page=${page}`,
    );
    const eps = res.data?.episodes ?? [];
    for (const e of eps) {
      const url = img(e.image);
      if (!url || typeof e.number !== "number") continue;
      const season = typeof e.seasonNumber === "number" ? e.seasonNumber : null;
      if (season != null && slug !== "absolute") map[`s${season}e${e.number}`] ??= url;
      const abs = slug === "absolute" ? e.number : e.absoluteNumber;
      if (typeof abs === "number") map[`abs${abs}`] ??= url;
    }
    if (eps.length < 500) break;
  }
  return map;
}

export function pickTvdbImage(
  map: TvdbImageMap,
  ep: {
    seasonNumber?: number;
    number: number;
    absoluteNumber?: number;
    imdbSeason?: number;
    imdbEpisode?: number;
  },
): string | null {
  const abs = ep.absoluteNumber ?? ep.number;
  return (
    map[`abs${abs}`] ??
    (ep.imdbSeason != null && ep.imdbEpisode != null
      ? map[`s${ep.imdbSeason}e${ep.imdbEpisode}`]
      : undefined) ??
    (ep.seasonNumber != null ? map[`s${ep.seasonNumber}e${ep.number}`] : undefined) ??
    null
  );
}
