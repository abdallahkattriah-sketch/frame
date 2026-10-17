import { HARBOR_MAL_CLIENT_ID } from "./config";

const BUILD_CLIENT_ID = (import.meta.env?.VITE_MAL_CLIENT_ID ?? "").trim() || HARBOR_MAL_CLIENT_ID;

let userClientId = "";

export function setMalClientId(clientId: string): void {
  userClientId = clientId.trim();
}

export function malClientId(): string {
  return userClientId || BUILD_CLIENT_ID;
}

export function hasMalClientId(): boolean {
  return malClientId() !== "";
}
