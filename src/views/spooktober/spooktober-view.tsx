import { useEffect, useRef, useState } from "react";
import { useT } from "@/lib/i18n";
import { useView } from "@/lib/view";
import { useSettings } from "@/lib/settings";
import { useSectionBack } from "@/lib/section-back";
import { openExternalUrlStrict } from "@/lib/window";
import { SpooktoberLoadingScene } from "./spooktober-loading";
import nativeTheme from "../../../scripts/spooktober-native/theme.css?raw";
import frameTheme from "./spooktober-frame.css?raw";
import "./spooktober-view.css";

const NATIVE_ENTRY = "/spooktober/native-entry.js?v=20261003-anime-mask-mal";
type Item = Record<string, unknown>;
type Intent = { intent: string; item?: Item; id?: string; url?: string };
type Runtime = {
  setActive: (active: boolean) => void;
  forget: () => void;
  back: () => boolean;
  dispose: () => void;
};
type NativeModule = {
  mountSpooktober: (options: {
    root: ShadowRoot;
    scroller: HTMLElement;
    onIntent: (message: Intent) => void;
  }) => Promise<Runtime>;
};
type SpooktoberViewProps = {
  active: boolean;
  onBack: () => void;
  entryToken?: number;
};
const text = (item: Item, key: string) =>
  typeof item[key] === "string" ? (item[key] as string) : "";

export function SpooktoberView({ active, onBack, entryToken }: SpooktoberViewProps) {
  const t = useT();
  const { openMeta } = useView();
  const { settings } = useSettings();
  const host = useRef<HTMLDivElement>(null);
  const runtime = useRef<Runtime | null>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [linkFailed, setLinkFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const isVisible = active;
  const visibility = useRef(isVisible);
  visibility.current = isVisible;
  useSectionBack(() => {
    if (!runtime.current?.back()) onBack();
  }, active);

  const onIntent = useRef<(message: Intent) => void>(() => {});
  onIntent.current = (message) => {
    if (!visibility.current) return;
    if (message.intent === "back") {
      onBack();
      return;
    }
    if (message.intent === "reload") {
      setAttempt((value) => value + 1);
      return;
    }
    if (
      message.intent === "external" &&
      typeof message.url === "string" &&
      /^https?:\/\//i.test(message.url)
    ) {
      void openExternalUrlStrict(message.url).catch(() => setLinkFailed(true));
      return;
    }
    const item = message.item;
    if (!item || typeof item !== "object") return;
    const title = text(item, "title");
    if (!title) return;
    if (message.intent === "meta") {
      const id = text(item, "imdbId");
      if (!/^tt\d{5,12}$/.test(id)) return;
      openMeta({
        id,
        name: title,
        type: item.type === "Series" ? "series" : "movie",
        poster: text(item, "poster"),
        description: text(item, "description"),
        releaseInfo: String(item.year ?? ""),
        genres: Array.isArray(item.genres)
          ? item.genres.filter((value): value is string => typeof value === "string")
          : undefined,
      });
    }
  };

  useEffect(() => {
    const scroller = host.current;
    if (!scroller) return;
    const root = scroller.shadowRoot ?? scroller.attachShadow({ mode: "open" });
    let cancelled = false;
    let mounted: Runtime | null = null;
    setReady(false);
    setFailed(false);
    void (async () => {
      try {
        const entryUrl = new URL(NATIVE_ENTRY, window.location.href).href;
        const module = (await import(/* @vite-ignore */ entryUrl)) as NativeModule;
        if (cancelled) return;
        mounted = await module.mountSpooktober({
          root,
          scroller,
          onIntent: (message) => onIntent.current(message),
        });
        if (cancelled) {
          mounted.dispose();
          return;
        }
        runtime.current = mounted;
        mounted.setActive(visibility.current);
        setReady(true);
      } catch (error) {
        console.error("Spooktober could not load", error);
        if (!cancelled) setFailed(true);
      }
    })();
    return () => {
      cancelled = true;
      mounted?.dispose();
      if (runtime.current === mounted) runtime.current = null;
    };
  }, [attempt, NATIVE_ENTRY]);
  useEffect(() => {
    if (entryToken) runtime.current?.forget();
  }, [entryToken, ready]);
  useEffect(() => {
    runtime.current?.setActive(isVisible);
  }, [isVisible, ready]);
  useEffect(() => {
    const root = host.current?.shadowRoot;
    if (!ready || !root) return;
    const style = document.createElement("style");
    style.dataset.harborTheme = "";
    style.textContent = nativeTheme + frameTheme;
    root.append(style);
    return () => style.remove();
  }, [ready, nativeTheme, frameTheme]);

  return (
    <div className="spooktober-native-view">
      <div
        ref={host}
        className="spooktober-world harbor-scroll"
        tabIndex={-1}
        aria-label="Spooktober"
        data-local-keyboard
        data-show-imdb={settings.showImdbBadge}
      />
      {(!ready || failed) && (
        <div
          className="spooktober-runtime-status"
          role="status"
          aria-label={t(failed ? "spooktober.error" : "spooktober.loading")}
        >
          {failed ? (
            <>
              <p>{t("spooktober.error")}</p>
              <button type="button" onClick={() => setAttempt((value) => value + 1)}>
                {t("spooktober.retry")}
              </button>
            </>
          ) : (
            <SpooktoberLoadingScene />
          )}
        </div>
      )}
      {linkFailed && (
        <div className="spooktober-notice" role="alert">
          {t("spooktober.linkError")}
          <button type="button" onClick={() => setLinkFailed(false)}>
            {t("common.close")}
          </button>
        </div>
      )}
    </div>
  );
}
