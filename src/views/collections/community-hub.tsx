import { GalleryVerticalEnd, Plus } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useT } from "@/lib/i18n";
import { useScrollMemory } from "@/lib/view";
import { BackToTop } from "@/components/back-to-top";
import {
  MAX_COLLECTIONS,
  createCollection,
  deleteCollection,
  useCollections,
} from "@/lib/collections";
import { purgeCollectionFromPages } from "@/lib/page-collection-rows";
import { CommunityCollectionCard } from "./community-collection-card";
import { CommunityCollectionEditor } from "./community-editor";
import { CommunityCollectionPage } from "./community-collection-page";

type Screen = { kind: "grid" } | { kind: "editor"; id: string } | { kind: "page"; id: string };

export function CommunityCollectionsView({ active }: { active: boolean }) {
  const [screen, setScreen] = useState<Screen>({ kind: "grid" });
  const returnFocus = useRef<HTMLElement | null>(null);
  const open = (next: Screen) => {
    if (screen.kind === "grid")
      returnFocus.current =
        document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setScreen(next);
  };
  const back = () => setScreen({ kind: "grid" });
  useEffect(() => {
    if (!active || screen.kind !== "grid" || !returnFocus.current) return;
    const frame = requestAnimationFrame(() => {
      returnFocus.current?.focus({ preventScroll: true });
      returnFocus.current = null;
    });
    return () => cancelAnimationFrame(frame);
  }, [active, screen.kind]);

  return (
    <>
      <HubGrid
        active={active && screen.kind === "grid"}
        onOpen={(id) => open({ kind: "page", id })}
        onEdit={(id) => open({ kind: "editor", id })}
      />
      {screen.kind === "editor" && (
        <CommunityCollectionEditor
          id={screen.id}
          onBack={back}
          onViewPage={(id) => setScreen({ kind: "page", id })}
        />
      )}
      {screen.kind === "page" && (
        <CommunityCollectionPage
          id={screen.id}
          onBack={back}
          onEdit={(id) => setScreen({ kind: "editor", id })}
        />
      )}
    </>
  );
}

function HubGrid({
  active,
  onOpen,
  onEdit,
}: {
  active: boolean;
  onOpen: (id: string) => void;
  onEdit: (id: string) => void;
}) {
  const t = useT();
  const collections = useCollections();
  const scrollRef = useRef<HTMLElement>(null);
  useScrollMemory("collections-hub", scrollRef, active);
  const atMax = collections.length >= MAX_COLLECTIONS;

  const create = () => {
    if (atMax) return;
    const id = createCollection(t("Untitled collection"));
    if (id) onEdit(id);
  };

  const remove = (id: string) => {
    deleteCollection(id);
    purgeCollectionFromPages(id);
  };

  return (
    <main
      ref={scrollRef}
      style={active ? undefined : { display: "none" }}
      className="flex-1 overflow-y-auto px-5 pt-24 pb-20 sm:px-8 lg:px-12 lg:pt-28"
    >
      <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-10">
        <header className="flex flex-wrap items-end justify-between gap-5">
          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] font-bold uppercase tracking-[0.28em] text-ink-subtle">
              {t("Showcase")}
            </span>
            <h1 className="font-display text-[44px] font-medium leading-[1.02] tracking-tight text-ink">
              {t("Collections")}
            </h1>
            <p className="max-w-xl text-[14px] leading-snug text-ink-muted">
              {t(
                "Curated, themed sets you can make beautiful and share by link. A Studio Ghibli shelf, the best heist movies, a marathon for a rainy weekend.",
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={create}
            disabled={atMax}
            className="inline-flex h-11 items-center gap-2 rounded-full bg-ink px-5 text-[13px] font-semibold text-canvas transition-opacity duration-200 ease-out hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus size={17} strokeWidth={2.4} />
            {t("New collection")}
          </button>
        </header>

        <section className="flex flex-col gap-5">
          <div className="flex items-baseline justify-between gap-4">
            <h2 className="text-[16px] font-semibold text-ink">{t("My collections")}</h2>
            {collections.length > 0 && (
              <span className="text-[12px] tabular-nums text-ink-muted">
                {t("{n} / {max}", { n: collections.length, max: MAX_COLLECTIONS })}
              </span>
            )}
          </div>

          {collections.length === 0 ? (
            <EmptyCollections onCreate={create} />
          ) : (
            <div
              className="grid gap-5"
              style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}
            >
              {collections.map((collection) => (
                <CommunityCollectionCard
                  key={collection.id}
                  collection={collection}
                  onOpen={onOpen}
                  onEdit={onEdit}
                  onDelete={remove}
                />
              ))}
            </div>
          )}
        </section>
      </div>
      <BackToTop scrollRef={scrollRef} />
    </main>
  );
}

function EmptyCollections({ onCreate }: { onCreate: () => void }) {
  const t = useT();
  return (
    <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-edge-soft bg-canvas/30 px-8 py-20 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-elevated/60 text-ink-subtle ring-1 ring-edge-soft/60">
        <GalleryVerticalEnd size={24} strokeWidth={1.6} />
      </span>
      <div className="flex flex-col gap-1.5">
        <h3 className="font-display text-[20px] font-medium text-ink">
          {t("Make your first collection")}
        </h3>
        <p className="max-w-sm text-[13px] leading-relaxed text-ink-muted">
          {t(
            "Give it a cover, a background, and the titles you want to show off. Then share the link.",
          )}
        </p>
      </div>
      <button
        type="button"
        onClick={onCreate}
        className="mt-1 inline-flex h-11 items-center gap-2 rounded-full bg-ink px-6 text-[13px] font-semibold text-canvas transition-opacity duration-200 ease-out hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Plus size={17} strokeWidth={2.2} />
        {t("New collection")}
      </button>
    </div>
  );
}
