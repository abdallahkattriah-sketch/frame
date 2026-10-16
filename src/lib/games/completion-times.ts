import { GameRequestPool } from "./request-pool";
import { hasIgdbCredentials, igdbRequest } from "./igdb-client";
import {
  completionTimeQuery,
  parseCompletionTimes,
  type GameCompletionTimes,
} from "./completion-time-data";

const pool = new GameRequestPool(1),
  cache = new Map<number, { at: number; data: GameCompletionTimes | null }>();
let unavailableUntil = 0;
export async function loadCompletionTimes(
  gameId: number,
  signal: AbortSignal,
): Promise<GameCompletionTimes | null> {
  const body = completionTimeQuery(gameId);
  signal.throwIfAborted();
  const held = cache.get(gameId);
  if (held && Date.now() - held.at < 24 * 60 * 60_000) return held.data;
  if (Date.now() < unavailableUntil || !hasIgdbCredentials()) return null;
  return pool.run(async () => {
    if (Date.now() < unavailableUntil) return null;
    const response = await igdbRequest(
      "game_time_to_beats",
      body,
      AbortSignal.any([signal, AbortSignal.timeout(10_000)]),
    );
    // Rejected credentials never become an estimate; no cooldown, so a corrected key works at once.
    if (response.status === 401 || response.status === 403) return null;
    if ([404, 501, 503].includes(response.status)) {
      unavailableUntil = Date.now() + 30 * 60_000;
      return null;
    }
    if (!response.ok) throw Error(`Completion times ${response.status}`);
    const reader = response.body?.getReader(),
      decoder = new TextDecoder();
    let raw = "",
      size = 0;
    if (reader) {
      try {
        while (true) {
          const part = await reader.read();
          if (part.done) break;
          size += part.value.byteLength;
          if (size > 256 * 1024) throw Error("Completion response too large");
          raw += decoder.decode(part.value, { stream: true });
        }
        raw += decoder.decode();
      } finally {
        await reader.cancel().catch(() => {});
        reader.releaseLock();
      }
    } else {
      raw = await response.text();
      if (raw.length > 256 * 1024) throw Error("Completion response too large");
    }
    const data = parseCompletionTimes(JSON.parse(raw), gameId);
    signal.throwIfAborted();
    cache.delete(gameId);
    cache.set(gameId, { at: Date.now(), data });
    if (cache.size > 80) cache.delete(cache.keys().next().value!);
    return data;
  }, signal);
}
