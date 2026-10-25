// Frame keeps Letterboxd as its only tracker. Trakt, Simkl, AniList and
// MyAnimeList stay compiled in until their code is deleted, but report no
// session and send no requests. Stored sessions are left untouched, so the
// tokens survive in backups and nothing is wiped.
export const TRACKERS_REMOVED = true;

export class TrackerRemovedError extends Error {
  constructor(tracker: string) {
    super(`${tracker} is not part of Frame`);
    this.name = "TrackerRemovedError";
  }
}
