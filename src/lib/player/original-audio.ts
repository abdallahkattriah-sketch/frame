import type { Meta } from "@/lib/cinemeta";
import { get } from "@/lib/providers/tmdb/tmdb-client";
import { normalizeLang } from "@/lib/subtitles/language";

type FindHit = { original_language?: unknown };
export type TmdbFindResponse = { movie_results?: FindHit[]; tv_results?: FindHit[] };

const resolved = new Map<string, string>();

// TMDB uses "xx" for titles with no spoken language.
export function usableOriginalLanguage(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const lang = normalizeLang(raw);
  return lang && lang !== "xx" ? lang : null;
}

export function originalLanguageFromFind(
  data: TmdbFindResponse | null,
  type: Meta["type"],
): string | null {
  if (!data) return null;
  const movie = data.movie_results?.[0];
  const tv = data.tv_results?.[0];
  const hit = type === "movie" ? (movie ?? tv) : (tv ?? movie);
  return usableOriginalLanguage(hit?.original_language);
}

export function originalLanguageForMeta(
  meta: Pick<Meta, "id" | "originalLanguage">,
): string | null {
  const own = usableOriginalLanguage(meta.originalLanguage);
  if (own) return own;
  if (meta.id.startsWith("kitsu:") || meta.id.startsWith("mal:")) return "ja";
  return null;
}

export async function resolveOriginalLanguage(
  meta: Pick<Meta, "id" | "type" | "originalLanguage">,
  imdbId: string | null | undefined,
  tmdbKey: string,
): Promise<string | null> {
  const known = originalLanguageForMeta(meta);
  if (known) return known;
  const tt = meta.id.startsWith("tt") ? meta.id.split(":")[0] : imdbId;
  if (!tt?.startsWith("tt") || !tmdbKey) return null;
  const cacheKey = `${meta.type}:${tt}`;
  const cached = resolved.get(cacheKey);
  if (cached) return cached;
  try {
    const data = await get<TmdbFindResponse>(tmdbKey, `find/${tt}`, {
      external_source: "imdb_id",
    });
    const lang = originalLanguageFromFind(data, meta.type);
    if (lang) resolved.set(cacheKey, lang);
    return lang;
  } catch {
    return null;
  }
}

/** Audio language order: the show's remembered pick, then the original language, then the user's list. */
export function audioLanguageOrder(
  preferred: string[],
  remembered: string | null | undefined,
  original: string | null | undefined,
): string[] {
  const head = [remembered, original].filter((l): l is string => !!l);
  return [...head, ...preferred.filter((l) => !head.includes(l))];
}
