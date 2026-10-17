import { safeFetch } from "@/lib/safe-fetch";
import type { TmdbDetail } from "../tmdb/tmdb-details";

// IMDb's public GraphQL endpoint, the same keyless source as lib/providers/harbor-imdb.ts.
const IMDB_GRAPHQL = "https://caching.graphql.imdb.com/";

const TITLE_DETAIL = `query($id: ID!) { title(id: $id) {
  id titleType { id } titleText { text } originalTitleText { text } releaseYear { year }
  primaryImage { url } runtime { seconds } genres { genres { text } }
  ratingsSummary { aggregateRating voteCount } plot { plotText { plainText } }
  directors: credits(first: 5, filter: { categories: ["director"] }) { edges { node { name { nameText { text } } } } }
  writers: credits(first: 5, filter: { categories: ["writer"] }) { edges { node { name { nameText { text } } } } }
  cast: credits(first: 30, filter: { categories: ["actor", "actress"] }) {
    edges { node { name { nameText { text } primaryImage { url } } ... on Cast { characters { name } } } }
  }
} }`;

const EPISODE_ID = `query($id: ID!, $season: String!) { title(id: $id) { episodes {
  episodes(first: 250, filter: { includeSeasons: [$season] }) {
    edges { node { id series { displayableEpisodeNumber { episodeNumber { text } } } } }
  }
} } }`;

type NameEdge = { node?: { name?: { nameText?: { text?: string } } } };

type CastEdge = {
  node?: {
    name?: { nameText?: { text?: string }; primaryImage?: { url?: string } | null };
    characters?: Array<{ name?: string }> | null;
  };
};

type ImdbTitle = {
  id?: string;
  titleType?: { id?: string } | null;
  titleText?: { text?: string } | null;
  originalTitleText?: { text?: string } | null;
  releaseYear?: { year?: number } | null;
  primaryImage?: { url?: string } | null;
  runtime?: { seconds?: number } | null;
  genres?: { genres?: Array<{ text?: string }> } | null;
  ratingsSummary?: { aggregateRating?: number | null; voteCount?: number | null } | null;
  plot?: { plotText?: { plainText?: string } | null } | null;
  directors?: { edges?: NameEdge[] } | null;
  writers?: { edges?: NameEdge[] } | null;
  cast?: { edges?: CastEdge[] } | null;
};

type EpisodeIds = {
  title?: {
    episodes?: {
      episodes?: {
        edges?: Array<{
          node?: {
            id?: string;
            series?: { displayableEpisodeNumber?: { episodeNumber?: { text?: string } } };
          };
        }>;
      };
    };
  } | null;
};

const cache = new Map<string, TmdbDetail>();

async function imdbQuery<T>(query: string, variables: Record<string, unknown>): Promise<T | null> {
  try {
    const res = await safeFetch(IMDB_GRAPHQL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-imdb-client-name": "imdb-web-next-localized",
      },
      body: JSON.stringify({ query, variables }),
    });
    if (!res.ok) return null;
    const j = (await res.json()) as { data?: T };
    return j.data ?? null;
  } catch {
    return null;
  }
}

function formatRuntime(seconds: number | undefined): string | undefined {
  if (!seconds) return undefined;
  const min = Math.round(seconds / 60);
  return `${min} min`;
}

function names(edges: NameEdge[] | undefined): Array<{ id: number; name: string }> {
  const seen = new Set<string>();
  const out: Array<{ id: number; name: string }> = [];
  for (const e of edges ?? []) {
    const name = e.node?.name?.nameText?.text;
    if (name && !seen.has(name)) {
      seen.add(name);
      out.push({ id: 0, name });
    }
  }
  return out;
}

function toCast(edges: CastEdge[] | undefined): TmdbDetail["cast"] {
  const out: TmdbDetail["cast"] = [];
  for (const e of edges ?? []) {
    const name = e.node?.name?.nameText?.text;
    if (!name) continue;
    out.push({
      id: 0,
      name,
      character: e.node?.characters?.[0]?.name ?? "",
      profilePath: e.node?.name?.primaryImage?.url ?? null,
      order: out.length,
    });
  }
  return out;
}

function toTmdbDetail(title: ImdbTitle, id: string): TmdbDetail {
  const rating = Number(title.ratingsSummary?.aggregateRating);
  const name = title.titleText?.text ?? "";
  return {
    kind: title.titleType?.id === "movie" ? "movie" : "tv",
    id: 0,
    imdbId: title.id ?? id,
    title: name,
    originalTitle: title.originalTitleText?.text ?? name,
    tagline: "",
    overview: title.plot?.plotText?.plainText ?? "",
    poster: title.primaryImage?.url ?? undefined,
    backdrop: undefined,
    logo: undefined,
    year: title.releaseYear?.year ? String(title.releaseYear.year) : undefined,
    rating: rating > 0 ? rating.toFixed(1) : undefined,
    voteCount: title.ratingsSummary?.voteCount ?? 0,
    runtime: formatRuntime(title.runtime?.seconds),
    status: "Released",
    genres: (title.genres?.genres ?? []).flatMap((g) => (g.text ? [g.text] : [])),
    originalLanguage: "",
    spokenLanguages: [],
    productionCountries: [],
    productionCompanies: [],
    networks: [],
    productionCompaniesRich: [],
    productionCountriesRich: [],
    spokenLanguagesRich: [],
    networksRich: [],
    trailerYtId: null,
    trailerCandidates: [],
    extraVideos: [],
    gallery: { backdrops: [], posters: [], logos: [] },
    cast: toCast(title.cast?.edges),
    crew: [],
    directors: names(title.directors?.edges),
    writers: names(title.writers?.edges),
    creators: [],
    producers: [],
    composer: [],
    cinematography: [],
    editor: [],
    recommendations: [],
    similar: [],
    collection: null,
    seasons: [],
    numberOfSeasons: 0,
    numberOfEpisodes: 0,
    keywords: [],
  };
}

async function episodeId(
  seriesId: string,
  season: number,
  episode: number,
): Promise<string | null> {
  const data = await imdbQuery<EpisodeIds>(EPISODE_ID, { id: seriesId, season: String(season) });
  const edges = data?.title?.episodes?.episodes?.edges ?? [];
  const match = edges.find(
    (e) => Number(e.node?.series?.displayableEpisodeNumber?.episodeNumber?.text) === episode,
  );
  return match?.node?.id ?? null;
}

export async function imdbapiDetails(
  metaId: string,
  season?: number,
  episode?: number,
): Promise<TmdbDetail | null> {
  if (!metaId.startsWith("tt")) return null;

  const cacheKey =
    season !== undefined && episode !== undefined ? `${metaId}:s${season}e${episode}` : metaId;

  const cached = cache.get(cacheKey);
  if (cached) return cached;

  let targetId = metaId;
  if (season !== undefined && episode !== undefined) {
    targetId = (await episodeId(metaId, season, episode)) ?? metaId;
  }

  const data = await imdbQuery<{ title?: ImdbTitle | null }>(TITLE_DETAIL, { id: targetId });
  const title = data?.title;
  if (!title?.titleText?.text) return null;

  const result = toTmdbDetail(title, targetId);
  cache.set(cacheKey, result);
  return result;
}
