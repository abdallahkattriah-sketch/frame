import { safeFetch } from "@/lib/safe-fetch";
import { TRAKT_API_BASE, TRAKT_API_VERSION } from "./config";
import { sessionClientId, traktClientId, traktClientSecretFor } from "./credentials";
import { setSession } from "./session";
import type { DeviceCode, TraktSession, TraktUserMe } from "./types";

export class TraktCredentialsMissingError extends Error {
  constructor() {
    super("trakt-client-id-missing");
    this.name = "TraktCredentialsMissingError";
  }
}

const baseHeaders = (clientId: string): HeadersInit => ({
  "Content-Type": "application/json",
  "trakt-api-version": TRAKT_API_VERSION,
  "trakt-api-key": clientId,
});

export type DeviceAuth = DeviceCode & { clientId: string };

export async function requestDeviceCode(): Promise<DeviceAuth> {
  const clientId = traktClientId();
  if (!clientId) throw new TraktCredentialsMissingError();
  const res = await safeFetch(`${TRAKT_API_BASE}/oauth/device/code`, {
    method: "POST",
    headers: baseHeaders(clientId),
    body: JSON.stringify({ client_id: clientId }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Trakt device-code request failed: HTTP ${res.status} ${body.slice(0, 160)}`);
  }
  const data = (await res.json()) as {
    device_code: string;
    user_code: string;
    verification_url: string;
    expires_in: number;
    interval: number;
  };
  return {
    clientId,
    deviceCode: data.device_code,
    userCode: data.user_code,
    verificationUrl: data.verification_url,
    expiresIn: data.expires_in,
    pollIntervalSec: data.interval,
  };
}

export type PollResult =
  | { kind: "authorized"; session: TraktSession }
  | { kind: "pending" }
  | { kind: "slow_down" }
  | { kind: "expired" }
  | { kind: "denied" }
  | { kind: "error"; message: string };

async function pollOnce(device: DeviceAuth): Promise<PollResult> {
  const secret = traktClientSecretFor(device.clientId);
  const res = await safeFetch(`${TRAKT_API_BASE}/oauth/device/token`, {
    method: "POST",
    headers: baseHeaders(device.clientId),
    body: JSON.stringify({
      code: device.deviceCode,
      client_id: device.clientId,
      ...(secret ? { client_secret: secret } : {}),
    }),
  });
  if (res.status === 200) {
    const data = (await res.json()) as {
      access_token: string;
      refresh_token: string;
      created_at: number;
      expires_in: number;
    };
    const session: TraktSession = {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      createdAt: data.created_at,
      expiresIn: data.expires_in,
      username: null,
      clientId: device.clientId,
    };
    return { kind: "authorized", session };
  }
  if (res.status === 400) return { kind: "pending" };
  if (res.status === 429) return { kind: "slow_down" };
  if (res.status === 410) return { kind: "expired" };
  if (res.status === 418) return { kind: "denied" };
  if (res.status === 401 || res.status === 403)
    return { kind: "error", message: `HTTP ${res.status}: check the Trakt client ID and secret` };
  return { kind: "error", message: `HTTP ${res.status}` };
}

export type PollHandle = {
  cancel: () => void;
};

export function pollForToken(
  device: DeviceAuth,
  onUpdate: (result: PollResult) => void,
): PollHandle {
  let cancelled = false;
  let intervalSec = device.pollIntervalSec;
  const startedAt = Date.now();

  (async () => {
    while (!cancelled) {
      const elapsedSec = (Date.now() - startedAt) / 1000;
      if (elapsedSec >= device.expiresIn) {
        if (!cancelled) onUpdate({ kind: "expired" });
        return;
      }

      const result = await pollOnce(device).catch((e: Error): PollResult => ({
        kind: "error",
        message: e.message,
      }));
      if (cancelled) return;

      if (result.kind === "slow_down") {
        intervalSec += 5;
        onUpdate(result);
      } else if (result.kind !== "pending") {
        onUpdate(result);
        return;
      }
      await new Promise((r) => setTimeout(r, intervalSec * 1000));
    }
  })();

  return {
    cancel: () => {
      cancelled = true;
    },
  };
}

export async function fetchUsername(session: TraktSession): Promise<string | null> {
  const res = await fetch(`${TRAKT_API_BASE}/users/me`, {
    headers: {
      ...(baseHeaders(sessionClientId(session)) as Record<string, string>),
      Authorization: `Bearer ${session.accessToken}`,
    },
  });
  if (!res.ok) return null;
  const data = (await res.json()) as TraktUserMe;
  return data.username ?? null;
}

export async function completeAuthorization(session: TraktSession): Promise<TraktSession> {
  const username = await fetchUsername(session).catch(() => null);
  const final: TraktSession = { ...session, username };
  setSession(final);
  return final;
}
