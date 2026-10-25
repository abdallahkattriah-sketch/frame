import { useEffect, useRef, useState } from "react";
import { Loader2, Plus, Trash2, User } from "lucide-react";
import { Search } from "@/components/icons/search-icon";
import { BackToTop } from "@/components/back-to-top";
import { useFollows, type FollowedPerson, type FollowRole } from "@/lib/follows";
import { useT } from "@/lib/i18n";
import { searchAll, type SearchPerson } from "@/lib/search";
import { useSettings } from "@/lib/settings";
import { useScrollMemory, useView } from "@/lib/view";

const ROLES: Array<{ id: FollowRole; label: string }> = [
  { id: "any", label: "Everything" },
  { id: "acting", label: "Acting" },
  { id: "directing", label: "Directing" },
];

function Avatar({ profile, size }: { profile?: string | null; size: number }) {
  return (
    <span
      className="flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-elevated text-ink-subtle"
      style={{ height: size, width: size }}
    >
      {profile ? (
        <img
          src={`https://image.tmdb.org/t/p/w185${profile}`}
          alt=""
          loading="lazy"
          className="h-full w-full object-cover"
        />
      ) : (
        <User size={Math.round(size * 0.42)} strokeWidth={1.8} />
      )}
    </span>
  );
}

function PersonSearch({
  tmdbKey,
  isFollowing,
  onAdd,
}: {
  tmdbKey: string;
  isFollowing: (id: number) => boolean;
  onAdd: (p: SearchPerson) => void;
}) {
  const t = useT();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchPerson[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const q = query.trim();
    if (!q || !tmdbKey) {
      setResults([]);
      return;
    }
    let cancelled = false;
    setBusy(true);
    const handle = window.setTimeout(async () => {
      try {
        const r = await searchAll(tmdbKey, q);
        if (!cancelled) setResults(r.people.slice(0, 8));
      } finally {
        if (!cancelled) setBusy(false);
      }
    }, 220);
    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [query, tmdbKey]);

  return (
    <div className="flex max-w-xl flex-col gap-2.5">
      <div className="flex h-12 items-center gap-2.5 rounded-xl bg-surface px-3.5 ring-1 ring-edge-soft focus-within:ring-accent">
        <Search size={15} className="text-ink-subtle" strokeWidth={2} />
        <input
          type="text"
          data-tv-text-field
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={
            tmdbKey ? t("Search actors, directors…") : t("Add a TMDB key in settings first")
          }
          disabled={!tmdbKey}
          className="h-full flex-1 bg-transparent text-[14px] text-ink placeholder:text-ink-subtle outline-none"
        />
        {busy && <Loader2 size={15} className="animate-spin text-ink-subtle" />}
      </div>
      {results.length > 0 && (
        <div className="flex flex-col gap-0.5 rounded-xl bg-surface p-1 ring-1 ring-edge-soft">
          {results.map((p) => {
            const followed = isFollowing(p.id);
            return (
              <button
                key={p.id}
                type="button"
                disabled={followed}
                onClick={() => {
                  onAdd(p);
                  setQuery("");
                  setResults([]);
                }}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-start text-[13px] transition-colors hover:bg-elevated disabled:opacity-50"
              >
                <Avatar profile={p.profile} size={36} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-ink">{p.name}</span>
                  <span className="block truncate text-[11.5px] text-ink-subtle">{p.knownFor}</span>
                </span>
                {followed ? (
                  <span className="text-[11px] font-semibold text-accent">{t("Following")}</span>
                ) : (
                  <Plus size={15} className="text-ink-subtle" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function PersonTile({
  person,
  onOpen,
  onRole,
  onRemove,
}: {
  person: FollowedPerson;
  onOpen: () => void;
  onRole: (role: FollowRole) => void;
  onRemove: () => void;
}) {
  const t = useT();
  return (
    <li className="flex items-center gap-3 rounded-2xl bg-surface p-3 ring-1 ring-edge-soft">
      <button type="button" onClick={onOpen} className="flex min-w-0 flex-1 items-center gap-3">
        <Avatar profile={person.profile} size={52} />
        <span className="truncate text-start text-[14px] font-medium text-ink">{person.name}</span>
      </button>
      <select
        value={person.role}
        onChange={(e) => onRole(e.target.value as FollowRole)}
        aria-label={t("What to follow")}
        className="rounded-lg bg-elevated px-2 py-1 text-[12px] text-ink ring-1 ring-edge-soft"
      >
        {ROLES.map((r) => (
          <option key={r.id} value={r.id}>
            {t(r.label)}
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={onRemove}
        aria-label={t("Unfollow")}
        title={t("Unfollow")}
        className="rounded-lg p-2 text-ink-subtle hover:bg-elevated hover:text-danger"
      >
        <Trash2 size={15} />
      </button>
    </li>
  );
}

export function FollowingView({ active = true }: { active?: boolean }) {
  const t = useT();
  const { settings } = useSettings();
  const { openPerson, setView } = useView();
  const { people, isFollowing, follow, unfollow, setRole } = useFollows();
  const scrollRef = useRef<HTMLElement>(null);
  useScrollMemory("following", scrollRef, active);

  return (
    <main ref={scrollRef} className="relative h-full overflow-y-auto overflow-x-hidden bg-canvas">
      <div className="flex w-full flex-col gap-8 px-12 pb-32 pt-12">
        <header>
          <h1 className="text-[34px] font-semibold tracking-tight text-ink">{t("Following")}</h1>
          <p className="mt-1 text-[14px] text-ink-subtle">
            {t("Their upcoming films show first in Radar.")}{" "}
            <button
              type="button"
              onClick={() => setView("radar")}
              className="text-accent hover:underline"
            >
              {t("Open Radar")}
            </button>
          </p>
        </header>
        <PersonSearch
          tmdbKey={settings.tmdbKey}
          isFollowing={isFollowing}
          onAdd={(p) => follow({ id: p.id, name: p.name, profile: p.profile, role: "any" })}
        />
        {people.length === 0 ? (
          <p className="text-[14px] text-ink-subtle">
            {t("You aren't following anyone yet. Search above, or use Follow on a person's page.")}
          </p>
        ) : (
          <ul className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-3">
            {people.map((p) => (
              <PersonTile
                key={p.id}
                person={p}
                onOpen={() => openPerson(p.id)}
                onRole={(role) => setRole(p.id, role)}
                onRemove={() => unfollow(p.id)}
              />
            ))}
          </ul>
        )}
      </div>
      <BackToTop scrollRef={scrollRef} />
    </main>
  );
}
