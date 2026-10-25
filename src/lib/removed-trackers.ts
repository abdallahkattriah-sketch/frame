// Frame keeps Letterboxd as its only tracker. Trakt, Simkl, AniList and
// MyAnimeList stay compiled in until their code is deleted, but report no
// session and send no requests. Stored sessions are left untouched, so the
// tokens survive in backups and nothing is wiped.
export const TRACKERS_REMOVED = true;

// Plex, Jellyfin and Emby are not part of Frame either. Saved server connections
// and their tokens stay in storage, but no part of the app sees them, so nothing
// asks a home server for a copy of a title.
export const MEDIA_SERVERS_REMOVED = true;

export class TrackerRemovedError extends Error {
  constructor(tracker: string) {
    super(`${tracker} is not part of Frame`);
    this.name = "TrackerRemovedError";
  }
}
