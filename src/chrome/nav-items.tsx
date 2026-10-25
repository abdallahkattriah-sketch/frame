import type { ReactNode } from "react";
import { usePluginCataloguesAvailable } from "@/lib/streams/plugins/available";
import { Puzzle, Radar, UserCheck } from "lucide-react";
import { NavGlyph } from "@/components/icons/nav-glyph";
import { NavLottie } from "@/components/icons/nav-lottie";
import lotHome from "@/assets/lottie/nav/home.json";
import lotCatalogs from "@/assets/lottie/nav/catalogs.json";
import lotMovies from "@/assets/lottie/nav/movies.json";
import lotShows from "@/assets/lottie/nav/shows.json";
import lotLibrary from "@/assets/lottie/nav/library.json";
import lotCollections from "@/assets/lottie/nav/collections.json";
import lotDownloads from "@/assets/lottie/nav/downloads.json";
import lotAddons from "@/assets/lottie/nav/addons.json";
import lotSettings from "@/assets/lottie/nav/settings.json";
import { AddonsIcon } from "@/components/icons/addons-icon";
import { CatalogsIcon } from "@/components/icons/catalogs-icon";
import { DiscoverIcon } from "@/components/icons/discover-icon";
import { HomeIcon } from "@/components/icons/home-icon";
import { LibraryIcon } from "@/components/icons/library-icon";
import { MoviesIcon } from "@/components/icons/movies-icon";
import { SettingsIcon } from "@/components/icons/settings-icon";
import { TvIcon } from "@/components/icons/tv-icon";
import { DownloadsNavIcon } from "@/chrome/downloads-nav-icon";
import type { LockableTab } from "@/lib/parental";
import type { View } from "@/lib/view";

export type NavItemId =
  | "home"
  | "discover"
  | "catalogs"
  | "plugins"
  | "movies"
  | "shows"
  | "radar"
  | "following"
  | "music"
  | "games"
  | "kids"
  | "anime"
  | "manga"
  | "ebook"
  | "live"
  | "sports"
  | "vod"
  | "calendar"
  | "library"
  | "collections"
  | "downloads"
  | "addons"
  | "settings";

export type NavItem = {
  id: NavItemId;
  label: string;
  render: (active: boolean, hovered?: boolean) => ReactNode;
  view: View;
  hideKey?: "anime" | "sports";
  parentalKey?: LockableTab;
  pinGated?: boolean;
};

export type NavCustomization = {
  order: string[];
  hidden: string[];
  renamed: Record<string, string>;
};

const NAV_ITEMS_ALL: NavItem[] = [
  {
    id: "home",
    label: "nav.home",
    render: (active, hovered) => (
      <NavLottie data={lotHome} hovered={hovered} fallback={<HomeIcon active={active} />} />
    ),
    view: "home",
  },
  {
    id: "discover",
    label: "nav.discover",
    render: (active) => <DiscoverIcon active={active} />,
    view: "discover",
    parentalKey: "discover",
  },
  {
    id: "catalogs",
    label: "nav.catalogs",
    render: (active, hovered) => (
      <NavLottie data={lotCatalogs} hovered={hovered} fallback={<CatalogsIcon active={active} />} />
    ),
    view: "catalogs",
    parentalKey: "discover",
  },
  {
    id: "plugins",
    label: "nav.plugins",
    render: (active) => (
      <Puzzle size={26} strokeWidth={2.2} className={active ? "" : "opacity-70"} />
    ),
    view: "plugins",
  },
  {
    id: "movies",
    label: "nav.movies",
    render: (active, hovered) => (
      <NavLottie data={lotMovies} hovered={hovered} fallback={<MoviesIcon active={active} />} />
    ),
    view: "movies",
    parentalKey: "movies",
  },
  {
    id: "shows",
    label: "nav.shows",
    render: (active, hovered) => (
      <NavLottie data={lotShows} hovered={hovered} loop fallback={<TvIcon active={active} />} />
    ),
    view: "shows",
    parentalKey: "shows",
  },
  {
    id: "radar",
    label: "nav.radar",
    render: (active) => (
      <Radar size={26} strokeWidth={2.2} className={active ? "" : "opacity-70"} />
    ),
    view: "radar",
  },
  {
    id: "following",
    label: "nav.following",
    render: (active) => (
      <UserCheck size={26} strokeWidth={2.2} className={active ? "" : "opacity-70"} />
    ),
    view: "following",
  },
  {
    id: "library",
    label: "nav.library",
    render: (active, hovered) => (
      <NavLottie data={lotLibrary} hovered={hovered} fallback={<LibraryIcon active={active} />} />
    ),
    view: "library",
    parentalKey: "library",
  },
  {
    id: "collections",
    label: "Collections",
    render: (_active, hovered) => (
      <NavLottie
        data={lotCollections}
        hovered={hovered}
        fallback={<NavGlyph name="collections" className="h-[26px] w-[26px] p-[2px]" />}
      />
    ),
    view: "collections-hub",
  },
  {
    id: "downloads",
    label: "nav.downloads",
    render: (active, hovered) => (
      <NavLottie
        data={lotDownloads}
        hovered={hovered}
        fallback={<DownloadsNavIcon active={active} />}
      />
    ),
    view: "downloads",
  },
  {
    id: "addons",
    label: "nav.addons",
    render: (active, hovered) => (
      <NavLottie data={lotAddons} hovered={hovered} fallback={<AddonsIcon active={active} />} />
    ),
    view: "addons",
    parentalKey: "addons",
  },
  {
    id: "settings",
    label: "nav.settings",
    render: (active, hovered) => (
      <NavLottie data={lotSettings} hovered={hovered} fallback={<SettingsIcon active={active} />} />
    ),
    view: "settings",
    pinGated: true,
  },
];

export const NAV_ITEMS: NavItem[] = NAV_ITEMS_ALL;
export const GAMES_IN_NAV = false;

export function useAvailableNavItems(): NavItem[] {
  const pluginCatalogs = usePluginCataloguesAvailable();
  return NAV_ITEMS.filter(
    (item) => (item.id !== "plugins" || pluginCatalogs) && (item.id !== "games" || GAMES_IN_NAV),
  );
}

export function applyNavCustomization(items: NavItem[], cfg: NavCustomization): NavItem[] {
  const shown = items
    .filter((it) => !cfg.hidden.includes(it.id))
    .map((it) => (cfg.renamed[it.id] ? { ...it, label: cfg.renamed[it.id] } : it));
  if (cfg.order.length === 0) return shown;
  const byId = new Map<string, NavItem>(shown.map((it) => [it.id, it]));
  const ordered: NavItem[] = [];
  for (const id of cfg.order) {
    const it = byId.get(id);
    if (it) ordered.push(it);
  }
  const inOrder = new Set(cfg.order);
  for (const it of shown) {
    if (!inOrder.has(it.id)) ordered.push(it);
  }
  return ordered;
}

export function effectiveNavOrder(cfg: NavCustomization): NavItemId[] {
  const all = NAV_ITEMS.map((it) => it.id);
  const known = new Set<string>(all);
  const out: NavItemId[] = [];
  for (const id of cfg.order) {
    if (known.has(id)) out.push(id as NavItemId);
  }
  const seen = new Set<string>(out);
  for (const id of all) {
    if (!seen.has(id)) out.push(id);
  }
  return out;
}

export function moveNavItem(
  cfg: NavCustomization,
  fromId: string,
  toId: string,
  position: "before" | "after",
): NavCustomization {
  if (fromId === toId) return cfg;
  const next = effectiveNavOrder(cfg).filter((id) => id !== fromId);
  const anchor = next.indexOf(toId as NavItemId);
  if (anchor < 0) return cfg;
  next.splice(position === "after" ? anchor + 1 : anchor, 0, fromId as NavItemId);
  return { ...cfg, order: next };
}

export function toggleNavHidden(cfg: NavCustomization, id: string): NavCustomization {
  const hidden = cfg.hidden.includes(id) ? cfg.hidden.filter((x) => x !== id) : [...cfg.hidden, id];
  return { ...cfg, hidden };
}

export function renameNavItem(cfg: NavCustomization, id: string, label: string): NavCustomization {
  const trimmed = label.trim();
  const renamed = { ...cfg.renamed };
  if (trimmed) renamed[id] = trimmed;
  else delete renamed[id];
  return { ...cfg, renamed };
}

export function resetNavCustomization(): NavCustomization {
  return { order: [], hidden: [], renamed: {} };
}
