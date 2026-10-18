import { normalizeRoomCode } from "./protocol";

const RELAY_PARAM = "harbor-relay";
const ROOM_PARAM = "harbor-room";

export type ParsedInvite = {
  relayUrl: string;
  roomCode: string;
};

// The desktop app has no web page to open, so its links carry the settings as a query a joiner pastes.
export function buildInviteUrl(relayUrl: string, roomCode: string): string {
  const params = new URLSearchParams();
  params.set(RELAY_PARAM, relayUrl);
  params.set(ROOM_PARAM, roomCode.toUpperCase());
  const query = params.toString();
  return typeof window !== "undefined" && !("__TAURI_INTERNALS__" in window)
    ? `${window.location.origin}/?${query}`
    : `?${query}`;
}

export function parseInviteFromLocation(): ParsedInvite | null {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  const relay = params.get(RELAY_PARAM)?.trim();
  const roomRaw = params.get(ROOM_PARAM)?.trim();
  if (!relay || !roomRaw) return null;
  const room = normalizeRoomCode(roomRaw);
  if (!room) return null;
  if (!/^wss?:\/\//.test(relay)) return null;
  return { relayUrl: relay, roomCode: room };
}

export function clearInviteParams(): void {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  url.searchParams.delete(RELAY_PARAM);
  url.searchParams.delete(ROOM_PARAM);
  window.history.replaceState(null, "", url.toString());
}
