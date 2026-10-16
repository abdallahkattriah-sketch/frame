import { ANILIST_AUTHORIZE_URL, ANILIST_CLIENT_ID } from "./config";
import { fetchViewer } from "./queries";
import { setSession } from "./session";
import { extractAnilistToken } from "./token-input";
import type { AnilistSession } from "./types";

export { extractAnilistToken };

// Implicit grant: the pin page shows the token (also in the URL fragment), so no secret or exchange is involved.
export function buildAuthorizeUrl(): string {
  const params = new URLSearchParams({
    client_id: ANILIST_CLIENT_ID,
    response_type: "token",
  });
  return `${ANILIST_AUTHORIZE_URL}?${params.toString()}`;
}

export async function completeAuthorization(pasted: string): Promise<AnilistSession> {
  const parsed = extractAnilistToken(pasted);
  if (!parsed) throw new Error("Paste the token or the page URL from AniList to continue");
  const viewer = await fetchViewer(parsed.token).catch(() => {
    throw new Error("AniList did not accept that token. Authorize again and paste the newest one.");
  });
  const now = Date.now();
  const session: AnilistSession = {
    accessToken: parsed.token,
    createdAt: now,
    expiresAt: now + parsed.expiresInSec * 1000,
    userId: viewer.id,
    userName: viewer.name,
    avatar: viewer.avatar,
  };
  setSession(session);
  return session;
}
