import { useEffect, useState } from "react";
import { isLinuxDesktop } from "@/lib/platform";
import { probeHandoff } from "./handoff";

const IS_TAURI = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

let appImage: Promise<boolean> | null = null;

// Linux installs update through their package manager, except an AppImage, which the Tauri updater replaces in place.
export function inAppUpdatesSupported(): Promise<boolean> {
  if (!IS_TAURI) return Promise.resolve(false);
  if (!isLinuxDesktop()) return Promise.resolve(true);
  appImage ??= probeHandoff().then((probe) => probe?.appImage === true);
  return appImage;
}

export function useInAppUpdatesSupported(): boolean {
  const [supported, setSupported] = useState(IS_TAURI && !isLinuxDesktop());
  useEffect(() => {
    let live = true;
    void inAppUpdatesSupported().then((value) => live && setSupported(value));
    return () => {
      live = false;
    };
  }, []);
  return supported;
}
