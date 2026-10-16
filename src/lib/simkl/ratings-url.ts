export type SimklAppParams = {
  base: string;
  clientId: string;
  appName: string;
  appVersion: string;
};

// GET /ratings answers one ID per call with {simkl: {rating, votes}}, or null when Simkl has no match.
export function simklRatingsUrl(spec: string, app: SimklAppParams): string | null {
  const sep = spec.indexOf(":");
  if (sep <= 0) return null;
  const key = spec.slice(0, sep);
  const value = spec.slice(sep + 1);
  if (!value) return null;
  const url = new URL(`${app.base}/ratings`);
  url.searchParams.set(key, value);
  url.searchParams.set("fields", "simkl");
  url.searchParams.set("client_id", app.clientId);
  url.searchParams.set("app-name", app.appName);
  url.searchParams.set("app-version", app.appVersion);
  return url.toString();
}

export function parseSimklRating(data: unknown): number | null {
  if (!data || typeof data !== "object") return null;
  const rating = (data as { simkl?: { rating?: unknown } }).simkl?.rating;
  return typeof rating === "number" && Number.isFinite(rating) ? rating : null;
}
