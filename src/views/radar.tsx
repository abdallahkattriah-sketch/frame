import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BackToTop } from "@/components/back-to-top";
import { PickCard } from "@/components/pick-card";
import { Row, ScrollRootContext } from "@/components/row";
import { Spinner } from "@/components/spinner";
import { useFollows } from "@/lib/follows";
import { useT } from "@/lib/i18n";
import { fetchFollowedUpcoming, fetchRadarPage, type RadarItem } from "@/lib/radar/radar";
import {
  appendUnique,
  prioritizeFollowed,
  type RadarDate,
  type RadarSectionId,
} from "@/lib/radar/release-dates";
import { useSettings } from "@/lib/settings";
import { useScrollMemory, useView } from "@/lib/view";
import { RegionPicker } from "./settings/region-picker";
import { fmtDate } from "./person/person-utils";

const SECTIONS: Array<{ id: RadarSectionId; title: string; blurb: string }> = [
  {
    id: "coming",
    title: "Coming Soon",
    blurb: "Upcoming theatrical releases. People you follow come first.",
  },
  {
    id: "digital",
    title: "Digital Release",
    blurb: "Films with a recent or upcoming digital release date.",
  },
  { id: "new", title: "Newly Released", blurb: "Recently released in theaters." },
  { id: "popular", title: "Popular & Discovery", blurb: "What people are watching right now." },
];

type SectionState = {
  items: RadarItem[];
  page: number;
  totalPages: number;
  loading: boolean;
  error: boolean;
};

const EMPTY: SectionState = { items: [], page: 0, totalPages: 1, loading: true, error: false };

function useRadarSection(
  key: string,
  section: RadarSectionId,
  region: string,
  followed: RadarItem[],
) {
  const [state, setState] = useState<SectionState>(EMPTY);
  const busy = useRef(false);

  const load = useCallback(
    async (page: number, reset: boolean) => {
      if (!key || busy.current) return;
      busy.current = true;
      setState((s) => ({ ...(reset ? EMPTY : s), loading: true, error: false }));
      try {
        // Skip pages that come back empty after date filtering, so Show More
        // always adds something while TMDB has pages left.
        let next = page;
        let res = await fetchRadarPage(key, section, region, next);
        while (res.items.length === 0 && next < res.totalPages && next < page + 4) {
          next += 1;
          res = await fetchRadarPage(key, section, region, next);
        }
        setState((s) => ({
          items: appendUnique(reset ? [] : s.items, res.items),
          page: next,
          totalPages: res.totalPages,
          loading: false,
          error: false,
        }));
      } catch {
        setState((s) => ({ ...s, loading: false, error: true }));
      } finally {
        busy.current = false;
      }
    },
    [key, section, region],
  );

  useEffect(() => {
    busy.current = false;
    void load(1, true);
  }, [load]);

  const items = useMemo(() => {
    if (section !== "coming" || followed.length === 0) return state.items;
    const merged = appendUnique(followed, state.items);
    return prioritizeFollowed(merged, new Set(followed.map((m) => m.id)));
  }, [section, followed, state.items]);

  return {
    ...state,
    items,
    hasMore: state.page > 0 && state.page < state.totalPages,
    more: () => void load(state.page + 1, false),
    retry: () =>
      void load(Math.max(1, state.page + (state.items.length ? 1 : 0)), !state.items.length),
  };
}

function dateLabel(
  d: RadarDate | null,
  region: string,
  t: ReturnType<typeof useT>,
): string | undefined {
  if (!d) return undefined;
  const kind = d.kind === "digital" ? t("Digital") : t("Theatrical");
  const where = d.region === region ? "" : ` · ${d.region}`;
  return `${kind} · ${fmtDate(d.date)}${where}`;
}

function RadarRow({
  id,
  title,
  blurb,
  tmdbKey,
  region,
  followed,
}: {
  id: RadarSectionId;
  title: string;
  blurb: string;
  tmdbKey: string;
  region: string;
  followed: RadarItem[];
}) {
  const t = useT();
  const s = useRadarSection(tmdbKey, id, region, followed);
  const showMore =
    s.hasMore || s.loading ? (
      <button
        type="button"
        disabled={s.loading}
        onClick={s.more}
        className="flex items-center gap-2 rounded-full px-3 py-1 text-[12.5px] font-medium text-ink-subtle ring-1 ring-edge-soft transition-colors hover:text-ink disabled:opacity-60"
      >
        {s.loading && <Spinner size={12} />}
        {t("Show more")}
      </button>
    ) : null;

  let body: React.ReactNode;
  if (s.items.length > 0) {
    body = s.items.map((m) => (
      <PickCard
        key={m.id}
        meta={m}
        reason={dateLabel(m.radarDate, region, t)}
        reasonDetail={
          m.radarDate
            ? t("Release date listed on TMDB for {region}", { region: m.radarDate.region })
            : undefined
        }
      />
    ));
  } else if (s.loading) {
    body = (
      <div className="flex h-40 items-center">
        <Spinner />
      </div>
    );
  } else if (s.error) {
    body = (
      <div className="flex h-40 items-center gap-3 text-[13px] text-ink-subtle">
        {t("TMDB didn't answer.")}
        <button type="button" onClick={s.retry} className="text-accent hover:underline">
          {t("Try again")}
        </button>
      </div>
    );
  } else {
    body = (
      <div className="flex h-40 items-center text-[13px] text-ink-subtle">
        {t("TMDB lists nothing here for {region} yet.", { region })}
      </div>
    );
  }

  return (
    <Row
      title={t(title)}
      headerDescription={t(blurb)}
      headerRight={showMore}
      min={148}
      shape="portrait"
      scrollKey={`radar:${id}`}
      onEndReached={s.hasMore ? s.more : undefined}
    >
      {body}
    </Row>
  );
}

export function RadarView({ active = true }: { active?: boolean }) {
  const t = useT();
  const { settings, update } = useSettings();
  const { openSettings, setView } = useView();
  const { people } = useFollows();
  const region = settings.radarRegion || "EG";
  const tmdbKey = settings.tmdbKey;
  const scrollRef = useRef<HTMLElement>(null);
  const [scrollEl, setScrollEl] = useState<HTMLElement | null>(null);
  const [followed, setFollowed] = useState<RadarItem[]>([]);
  useScrollMemory("radar", scrollRef, active);

  const scrollCb = useCallback((el: HTMLElement | null) => {
    (scrollRef as { current: HTMLElement | null }).current = el;
    setScrollEl(el);
  }, []);

  const peopleKey = people.map((p) => `${p.id}:${p.role}`).join(",");
  useEffect(() => {
    if (!tmdbKey || people.length === 0) {
      setFollowed([]);
      return;
    }
    let cancelled = false;
    fetchFollowedUpcoming(tmdbKey, people, region)
      .then((items) => {
        if (!cancelled) setFollowed(items);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
    // people is re-created on every settings write; peopleKey tracks what matters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tmdbKey, region, peopleKey]);

  return (
    <main ref={scrollCb} className="relative h-full overflow-y-auto overflow-x-hidden bg-canvas">
      <ScrollRootContext.Provider value={scrollEl}>
        <div className="relative flex w-full flex-col gap-12 px-12 pb-32 pt-12">
          <header className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-[34px] font-semibold tracking-tight text-ink">{t("Radar")}</h1>
              <p className="mt-1 text-[14px] text-ink-subtle">
                {people.length > 0
                  ? t("Following {n} people.", { n: people.length })
                  : t("Follow actors and directors to see their films first.")}{" "}
                <button
                  type="button"
                  onClick={() => setView("following")}
                  className="text-accent hover:underline"
                >
                  {t("Manage Following")}
                </button>
              </p>
            </div>
            <div className="flex items-center gap-3 text-[13px] text-ink-subtle">
              {t("Release region")}
              <RegionPicker value={region} onChange={(code) => update({ radarRegion: code })} />
            </div>
          </header>
          {!tmdbKey ? (
            <div className="flex flex-col items-start gap-3 rounded-2xl bg-surface p-6 ring-1 ring-edge-soft">
              <p className="text-[14px] text-ink">
                {t("Radar reads release dates from TMDB. Add your TMDB key to use it.")}
              </p>
              <button
                type="button"
                onClick={() => openSettings("library")}
                className="rounded-full bg-accent px-4 py-1.5 text-[13px] font-semibold text-canvas"
              >
                {t("Add TMDB key")}
              </button>
            </div>
          ) : (
            SECTIONS.map((s) => (
              <RadarRow
                key={`${s.id}:${region}`}
                id={s.id}
                title={s.title}
                blurb={s.blurb}
                tmdbKey={tmdbKey}
                region={region}
                followed={followed}
              />
            ))
          )}
        </div>
        <BackToTop scrollRef={scrollRef} />
      </ScrollRootContext.Provider>
    </main>
  );
}
