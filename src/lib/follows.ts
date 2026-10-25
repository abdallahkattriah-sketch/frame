import { useCallback, useMemo } from "react";
import { useSettings } from "@/lib/settings";
import type { Settings } from "@/lib/settings/types";

// Followed people live in `settings.customCalendar.trackedPeople`, the list the
// old Calendar used. Keeping that key means existing follows, profile scoping and
// backups carry over with no migration; Radar and the Following page both read it.
export type FollowedPerson = Settings["customCalendar"]["trackedPeople"][number];
export type FollowRole = FollowedPerson["role"];

export function addFollow(list: FollowedPerson[], person: FollowedPerson): FollowedPerson[] {
  if (list.some((p) => p.id === person.id)) return list;
  return [...list, person];
}

export function removeFollow(list: FollowedPerson[], id: number): FollowedPerson[] {
  return list.filter((p) => p.id !== id);
}

export function setFollowRole(
  list: FollowedPerson[],
  id: number,
  role: FollowRole,
): FollowedPerson[] {
  return list.map((p) => (p.id === id ? { ...p, role } : p));
}

export function useFollows() {
  const { settings, update } = useSettings();
  const calendar = settings.customCalendar;
  const people = calendar.trackedPeople;
  const write = useCallback(
    (next: FollowedPerson[]) => update({ customCalendar: { ...calendar, trackedPeople: next } }),
    [calendar, update],
  );
  const ids = useMemo(() => new Set(people.map((p) => p.id)), [people]);
  return {
    people,
    isFollowing: (id: number) => ids.has(id),
    follow: (person: FollowedPerson) => write(addFollow(people, person)),
    unfollow: (id: number) => write(removeFollow(people, id)),
    setRole: (id: number, role: FollowRole) => write(setFollowRole(people, id, role)),
  };
}
