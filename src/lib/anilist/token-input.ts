export const DEFAULT_TOKEN_TTL_SEC = 31536000;

export type PastedToken = { token: string; expiresInSec: number };

// Accepts the bare token from the pin page, or a URL carrying it in the fragment.
export function extractAnilistToken(input: string): PastedToken | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const fromUrl = /[?&#]access_token=([^&\s#]+)/.exec(trimmed);
  const expires = /[?&#]expires_in=(\d+)/.exec(trimmed);
  const expiresInSec = expires ? Number(expires[1]) : DEFAULT_TOKEN_TTL_SEC;
  if (fromUrl) {
    let token = fromUrl[1];
    try {
      token = decodeURIComponent(token);
    } catch {
      token = fromUrl[1];
    }
    return { token: token.trim(), expiresInSec };
  }
  const bare = trimmed.replace(/^["'\s]+|["'\s]+$/g, "").replace(/\s+/g, "");
  return /^[A-Za-z0-9._-]{20,}$/.test(bare)
    ? { token: bare, expiresInSec: DEFAULT_TOKEN_TTL_SEC }
    : null;
}
