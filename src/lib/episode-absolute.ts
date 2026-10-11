// Maps each regular season to the number of regular episodes that come before it; specials (season 0) get no entry.
export function seasonOffsets(
  counts: Iterable<readonly [season: number, count: number]>,
): Map<number, number> {
  const bySeason = new Map<number, number>();
  for (const [season, count] of counts) {
    if (season >= 1 && count > 0) bySeason.set(season, Math.max(bySeason.get(season) ?? 0, count));
  }
  const out = new Map<number, number>();
  let running = 0;
  for (const season of [...bySeason.keys()].sort((a, b) => a - b)) {
    out.set(season, running);
    running += bySeason.get(season)!;
  }
  return out;
}

export function absoluteNumberFor(
  offsets: Map<number, number>,
  season: number,
  episode: number,
): number | undefined {
  if (season < 1 || episode < 1) return undefined;
  const offset = offsets.get(season);
  return offset == null ? undefined : offset + episode;
}

// The absolute number is only worth a label where it differs from the in-season number.
export function distinctAbsolute(
  absolute: number | null | undefined,
  episode: number,
): number | null {
  return absolute != null && absolute > 0 && absolute !== episode ? absolute : null;
}
