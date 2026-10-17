import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { openUrl } from "@/lib/window";
import { buildAuthorizeUrl, completeAuthorization, MalCredentialsMissingError } from "./auth";
import { getSession, isAuthenticated, setSession, subscribeSession } from "./session";
import { validateMalSession } from "./validate";
import type { MalSession } from "./types";

function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

// The desktop app catches MAL's redirect on MAL_REDIRECT_URI; pasting the address stays as the fallback.
async function startRedirectListener(): Promise<void> {
  if (!isTauri()) return;
  const { invoke } = await import("@tauri-apps/api/core");
  await invoke<boolean>("mal_auth_start").catch(() => false);
}

export type ConnectState =
  | { kind: "idle" }
  | { kind: "needs-code" }
  | { kind: "verifying" }
  | { kind: "missing-credentials" }
  | { kind: "error"; message: string }
  | { kind: "success"; session: MalSession };

type Value = {
  session: MalSession | null;
  isConnected: boolean;
  userName: string | null;
  connectState: ConnectState;
  beginConnect: () => void;
  submitCode: (code: string) => void;
  cancelConnect: () => void;
  disconnect: () => void;
};

const Ctx = createContext<Value | null>(null);

export function MalProvider({ children }: { children: ReactNode }) {
  const [session, setLocalSession] = useState<MalSession | null>(() => getSession());
  const [connectState, setConnectState] = useState<ConnectState>({ kind: "idle" });

  useEffect(() => subscribeSession(() => setLocalSession(getSession())), []);

  useEffect(() => {
    void validateMalSession();
  }, [session?.accessToken]);

  const submitCode = useCallback((code: string) => {
    setConnectState({ kind: "verifying" });
    completeAuthorization(code)
      .then((final) => setConnectState({ kind: "success", session: final }))
      .catch((e: Error) => setConnectState({ kind: "error", message: e.message }));
  }, []);

  useEffect(() => {
    if (!isTauri()) return;
    let unlisten: (() => void) | null = null;
    let disposed = false;
    void import("@tauri-apps/api/event").then(({ listen }) =>
      listen<{ code: string; state: string }>("mal-auth", (e) => {
        const { code, state } = e.payload ?? { code: "", state: "" };
        if (code)
          submitCode(`?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`);
      }).then((fn) => {
        if (disposed) fn();
        else unlisten = fn;
      }),
    );
    return () => {
      disposed = true;
      unlisten?.();
    };
  }, [submitCode]);

  const beginConnect = useCallback(() => {
    try {
      const url = buildAuthorizeUrl();
      setConnectState({ kind: "needs-code" });
      void startRedirectListener().then(() => openUrl(url));
    } catch (e) {
      if (e instanceof MalCredentialsMissingError) {
        setConnectState({ kind: "missing-credentials" });
        return;
      }
      setConnectState({
        kind: "error",
        message: e instanceof Error ? e.message : "MyAnimeList is not configured in this build.",
      });
    }
  }, []);

  const cancelConnect = useCallback(() => setConnectState({ kind: "idle" }), []);

  const disconnect = useCallback(() => {
    setSession(null);
    setConnectState({ kind: "idle" });
  }, []);

  const value = useMemo<Value>(
    () => ({
      session,
      isConnected: !!session && isAuthenticated(),
      userName: session?.userName ?? null,
      connectState,
      beginConnect,
      submitCode,
      cancelConnect,
      disconnect,
    }),
    [session, connectState, beginConnect, submitCode, cancelConnect, disconnect],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useMal(): Value {
  const v = useContext(Ctx);
  if (!v) throw new Error("useMal outside MalProvider");
  return v;
}
