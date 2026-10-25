import { lazy, Suspense } from "react";
import { useT } from "@/lib/i18n";

const LetterboxdPanel = lazy(() =>
  import("./letterboxd-panel").then((m) => ({ default: m.LetterboxdPanel })),
);

// Letterboxd is the only tracker Frame keeps. Trakt, Simkl, AniList and MAL
// sessions stay stored but have no settings page.
export function TrackersPanel() {
  const t = useT();
  return (
    <div className="harbor-cascade flex flex-col gap-10">
      <Suspense
        fallback={
          <div className="h-40 rounded-[10px] bg-elevated" aria-label={t("Loading settings")} />
        }
      >
        <LetterboxdPanel />
      </Suspense>
    </div>
  );
}
