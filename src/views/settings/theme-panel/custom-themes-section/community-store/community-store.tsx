import { useState } from "react";
import { AlertCircle, ExternalLink, RefreshCw, Sparkles } from "../../../icons";
import { Search } from "@/components/icons/search-icon";
import { useT } from "@/lib/i18n";
import { THEME_SUBMIT_URL, type StoreTheme } from "@/lib/theme-store";
import { openUrl } from "@/lib/window";
import type { Mood } from "./color-rank";
import { ThemeDetail } from "./theme-detail";
import { useStoreThemes } from "./use-store-themes";
import { StoreTabs, type StoreTab } from "./store-tabs";
import { StoreDiscover } from "./store-discover";
import { StoreBrowse } from "./store-browse";
import { StoreSkeleton } from "./store-skeleton";
import { BundleBrowse } from "./bundle-browse";
import type { BundleKind } from "@/lib/bundle-store";

export function CommunityStore({ initialTab = "discover" }: { initialTab?: StoreTab } = {}) {
  const t = useT();
  const { data, loading, error, reload } = useStoreThemes();
  const [tab, setTab] = useState<StoreTab>(initialTab);
  const [query, setQuery] = useState("");
  const [mood, setMood] = useState<Mood | null>(null);
  const [selected, setSelected] = useState<StoreTheme | null>(null);

  const ready = !!data && !loading && !error;
  const empty = ready && data.all.length === 0;
  const interactive = ready && !empty;
  const themeTab = tab === "discover" || tab === "themes";
  const bundleKind: BundleKind | null =
    tab === "badges" ? "badge" : tab === "awards" ? "award" : null;

  const onTab = (t: StoreTab) => {
    setTab(t);
    if (t === "discover") {
      setQuery("");
      setMood(null);
    }
  };
  const onSearch = (v: string) => {
    setQuery(v);
    if (v && tab === "discover") setTab("themes");
  };
  const onPickMood = (m: Mood) => {
    setMood(m);
    setQuery("");
    setTab("themes");
  };
  const onBrowseAll = () => {
    setMood(null);
    setTab("themes");
  };
  const onAuthor = (author: string) => {
    setMood(null);
    setQuery(author);
    setTab("themes");
  };
  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 ps-[9px] pb-1">
        <StoreTabs active={tab} onSelect={onTab} />
        {themeTab && (
          <div className="flex items-center gap-2.5">
            <div
              className={`flex h-11 items-center gap-2 rounded-full bg-elevated px-4 transition-opacity ${
                interactive ? "" : "pointer-events-none opacity-40"
              }`}
            >
              <Search size={18} className="text-ink-subtle" />
              <input
                value={query}
                onChange={(e) => onSearch(e.target.value)}
                placeholder={t("Search themes")}
                className="w-48 bg-transparent text-[15.5px] leading-[22px] text-ink placeholder:text-ink-subtle focus:outline-none"
              />
            </div>
            <SubmitThemeButton />
          </div>
        )}
      </div>

      {bundleKind ? (
        <BundleBrowse kind={bundleKind} />
      ) : loading ? (
        <StoreSkeleton />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : !data || data.all.length === 0 ? (
        <EmptyState />
      ) : tab === "discover" ? (
        <StoreDiscover
          data={data}
          onOpen={setSelected}
          onAuthor={onAuthor}
          onBrowseAll={onBrowseAll}
          onPickMood={onPickMood}
        />
      ) : (
        <StoreBrowse
          themes={data.all}
          query={query}
          mood={mood}
          onOpen={setSelected}
          onClearMood={() => setMood(null)}
        />
      )}

      {selected && <ThemeDetail theme={selected} onClose={() => setSelected(null)} />}
    </section>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  const t = useT();
  return (
    <div className="mx-auto flex max-w-sm flex-col items-center gap-4 rounded-md bg-surface px-6 py-14 text-center">
      <span className="grid h-12 w-12 place-items-center rounded-full bg-danger/15 text-danger">
        <AlertCircle size={22} />
      </span>
      <p className="max-w-[66ch] text-[15.5px] leading-[22px] text-ink-muted">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="flex h-11 items-center gap-2 rounded-full bg-ink px-5 text-[15.5px] font-semibold text-canvas transition-[opacity,transform] hover:opacity-90 active:scale-[0.97] motion-reduce:active:scale-100"
      >
        <RefreshCw size={16} strokeWidth={2.2} /> {t("Try again")}
      </button>
    </div>
  );
}

// Themes join the repo index by pull request; in-app publishing needs a Harbor account.
function SubmitThemeButton() {
  const t = useT();
  return (
    <button
      type="button"
      onClick={() => openUrl(THEME_SUBMIT_URL)}
      className="flex h-11 items-center gap-2 rounded-full bg-ink px-5 text-[15.5px] font-semibold text-canvas transition-[opacity,transform] hover:opacity-90 active:scale-[0.97] motion-reduce:active:scale-100"
    >
      <ExternalLink size={16} strokeWidth={2.2} /> {t("Submit a theme")}
    </button>
  );
}

function EmptyState() {
  const t = useT();
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 rounded-md border border-dashed border-edge bg-surface px-6 py-16 text-center">
      <span className="grid h-14 w-14 place-items-center rounded-full bg-accent-soft text-accent">
        <Sparkles size={26} />
      </span>
      <div className="flex flex-col gap-1.5">
        <h3 className="text-[18px] font-semibold tracking-tight text-ink">
          {t("No community themes yet")}
        </h3>
        <p className="max-w-[66ch] text-[15.5px] leading-[22px] text-ink-muted">
          {t(
            "Themes are added to the library by pull request. Export yours as a .harborstyle file and follow the guide to submit it.",
          )}
        </p>
      </div>
      <SubmitThemeButton />
    </div>
  );
}
