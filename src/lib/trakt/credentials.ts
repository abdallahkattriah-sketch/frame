import { LEGACY_TRAKT_CLIENT_ID } from "./config";
import type { TraktSession } from "./types";

const BUILD_CLIENT_ID = (import.meta.env?.VITE_TRAKT_CLIENT_ID ?? "").trim();
const BUILD_CLIENT_SECRET = (import.meta.env?.VITE_TRAKT_CLIENT_SECRET ?? "").trim();

let userClientId = "";
let userClientSecret = "";

export function setTraktCredentials(clientId: string, clientSecret: string): void {
  userClientId = clientId.trim();
  userClientSecret = clientSecret.trim();
}

// The app the user signs in with: the ID from Settings, else the build default.
export function traktClientId(): string {
  return userClientId || BUILD_CLIENT_ID;
}

export function hasTraktClientId(): boolean {
  return traktClientId() !== "";
}

// Trakt marks the secret optional for device sign-in, so it is sent only when the user set one for this client.
export function traktClientSecretFor(clientId: string): string {
  if (userClientId) return clientId === userClientId ? userClientSecret : "";
  return clientId === BUILD_CLIENT_ID ? BUILD_CLIENT_SECRET : "";
}

// A token only works with the API key of the app that issued it; sessions without clientId came from upstream's app.
export function sessionClientId(session: TraktSession): string {
  return session.clientId || LEGACY_TRAKT_CLIENT_ID;
}

export function traktApiKey(session: TraktSession | null): string {
  if (session) return sessionClientId(session);
  return traktClientId() || LEGACY_TRAKT_CLIENT_ID;
}
