import { safeFetch } from "@/lib/safe-fetch";

const TOKEN_URL = "https://id.twitch.tv/oauth2/token";
const API = "https://api.igdb.com/v4";
const TOKEN_KEY = "harbor.igdb.token.v1";
const EXPIRY_MARGIN_MS = 5 * 60_000;

type Credentials = { clientId: string; clientSecret: string };
type TokenCache = { token: string; expiresAt: number; clientId: string };

let credentials: Credentials = { clientId: "", clientSecret: "" };
let cachedToken: TokenCache | null = null;
let tokenInflight: Promise<string | null> | null = null;

export class IgdbNotConfiguredError extends Error {
  constructor() {
    super("IGDB needs a Twitch client ID and secret in Settings > Library > Games.");
    this.name = "IgdbNotConfiguredError";
  }
}

export function setIgdbCredentials(clientId: string, clientSecret: string): void {
  const next = { clientId: clientId.trim(), clientSecret: clientSecret.trim() };
  if (next.clientId === credentials.clientId && next.clientSecret === credentials.clientSecret)
    return;
  credentials = next;
  forgetToken();
}

export function hasIgdbCredentials(): boolean {
  return credentials.clientId !== "" && credentials.clientSecret !== "";
}

function forgetToken(): void {
  cachedToken = null;
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

function storedToken(): TokenCache | null {
  if (cachedToken) return cachedToken;
  try {
    const raw = localStorage.getItem(TOKEN_KEY);
    cachedToken = raw ? (JSON.parse(raw) as TokenCache) : null;
  } catch {
    cachedToken = null;
  }
  return cachedToken;
}

async function appToken(): Promise<string | null> {
  const held = storedToken();
  if (held && held.clientId === credentials.clientId && Date.now() < held.expiresAt)
    return held.token;
  if (tokenInflight) return tokenInflight;
  const { clientId, clientSecret } = credentials;
  tokenInflight = (async () => {
    try {
      const query = new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "client_credentials",
      });
      const res = await safeFetch(`${TOKEN_URL}?${query}`, { method: "POST" });
      if (!res.ok) return null;
      const j = (await res.json()) as { access_token?: unknown; expires_in?: unknown };
      if (typeof j.access_token !== "string" || typeof j.expires_in !== "number") return null;
      const next: TokenCache = {
        token: j.access_token,
        expiresAt: Date.now() + j.expires_in * 1000 - EXPIRY_MARGIN_MS,
        clientId,
      };
      cachedToken = next;
      try {
        localStorage.setItem(TOKEN_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next.token;
    } catch {
      return null;
    } finally {
      tokenInflight = null;
    }
  })();
  return tokenInflight;
}

// POSTs an Apicalypse body to api.igdb.com/v4/<endpoint>; a 401 drops the cached token and retries once.
export async function igdbRequest(
  endpoint: string,
  body: string,
  signal?: AbortSignal,
): Promise<Response> {
  if (!hasIgdbCredentials()) throw new IgdbNotConfiguredError();
  for (let attempt = 0; ; attempt += 1) {
    const token = await appToken();
    if (!token) return new Response(null, { status: 401 });
    const res = await safeFetch(`${API}/${endpoint}`, {
      method: "POST",
      headers: {
        "Client-ID": credentials.clientId,
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        "Content-Type": "text/plain",
      },
      body,
      signal,
    });
    if (res.status !== 401 || attempt > 0) return res;
    forgetToken();
  }
}
