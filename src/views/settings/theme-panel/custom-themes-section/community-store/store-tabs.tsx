import { MarketSegmented, type SegmentedItem } from "./market/market-segmented";
import { DiscoverCompassIcon, ThemesDropIcon } from "./store-tab-icons";

export type StoreTab = "discover" | "themes" | "badges" | "awards";

const TABS: SegmentedItem[] = [
  { id: "discover", label: "Discover", icon: <DiscoverCompassIcon size={16} strokeWidth={2.2} /> },
  { id: "themes", label: "Themes", icon: <ThemesDropIcon size={16} strokeWidth={2.2} /> },
];

export function StoreTabs({
  active,
  onSelect,
}: {
  active: StoreTab;
  onSelect: (t: StoreTab) => void;
}) {
  return (
    <MarketSegmented items={TABS} active={active} onSelect={(id) => onSelect(id as StoreTab)} />
  );
}
