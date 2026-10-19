import type { SkipSegment } from "./types";

const AGREE_TOLERANCE_SEC = 5;

function agrees(a: SkipSegment, b: SkipSegment): boolean {
  return (
    a.kind === b.kind &&
    a.source !== b.source &&
    Math.abs(a.startSec - b.startSec) <= AGREE_TOLERANCE_SEC &&
    Math.abs(a.endSec - b.endSec) <= AGREE_TOLERANCE_SEC
  );
}

function overlaps(a: SkipSegment, b: SkipSegment): boolean {
  return a.startSec < b.endSec && a.endSec > b.startSec;
}

const SELF_OVERLAP_TOLERANCE_SEC = 2;

// An intro and a recap from one source cannot overlap; when they do, that source's timing is wrong, so both go.
export function dropSelfContradicting(list: SkipSegment[]): SkipSegment[] {
  const clash = (a: SkipSegment, b: SkipSegment) =>
    a.kind !== b.kind &&
    (a.kind === "intro" || a.kind === "recap") &&
    (b.kind === "intro" || b.kind === "recap") &&
    Math.min(a.endSec, b.endSec) - Math.max(a.startSec, b.startSec) > SELF_OVERLAP_TOLERANCE_SEC;
  return list.filter((s) => !list.some((o) => clash(s, o)));
}

// Drops a segment no other source backs when a clashing segment of the same kind is backed by two sources.
export function dropOutvoted(sourcesInPriority: SkipSegment[][]): SkipSegment[][] {
  const all = sourcesInPriority.flat();
  const backed = (s: SkipSegment) => all.some((o) => agrees(s, o));
  return sourcesInPriority.map((list) =>
    list.filter((s) => {
      if (s.kind === "ad" || backed(s)) return true;
      return !all.some(
        (o) => o.kind === s.kind && o.source !== s.source && overlaps(s, o) && backed(o),
      );
    }),
  );
}
