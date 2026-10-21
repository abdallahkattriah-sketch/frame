import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import type { PlayerBridge } from "@/lib/player/bridge";
import { getPlaybackPosition, subscribePlaybackClock } from "@/lib/player/playback-clock";

export type AbLoopState = {
  a: number | null;
  b: number | null;
  setA: () => void;
  setB: () => void;
  clear: () => void;
  active: boolean;
};

export function useAbLoop(params: {
  bridgeRef: RefObject<PlayerBridge | null>;
  durationSec: number;
  resetKey: string;
}): AbLoopState {
  const { bridgeRef, durationSec, resetKey } = params;
  const [a, setAState] = useState<number | null>(null);
  const [b, setBState] = useState<number | null>(null);
  const positionRef = useRef(getPlaybackPosition());

  useEffect(
    () =>
      subscribePlaybackClock(() => {
        positionRef.current = getPlaybackPosition();
      }),
    [],
  );

  useEffect(() => {
    setAState(null);
    setBState(null);
    bridgeRef.current?.setAbLoop(null, null);
  }, [resetKey, bridgeRef]);

  useEffect(() => {
    bridgeRef.current?.setAbLoop(a, b);
  }, [a, b, bridgeRef]);

  useEffect(() => {
    if (a == null || b == null || b <= a) return;
    return subscribePlaybackClock(() => {
      if (getPlaybackPosition() >= b - 0.05) bridgeRef.current?.seek(a);
    });
  }, [a, b, bridgeRef]);

  const setA = useCallback(() => {
    const t = Math.max(0, positionRef.current);
    setAState(t);
    setBState((cur) => (cur != null && cur <= t ? null : cur));
  }, []);

  const setB = useCallback(() => {
    const t = Math.max(0, positionRef.current);
    setBState((cur) => {
      if (a == null) return cur;
      if (t <= a) return cur;
      return t;
    });
  }, [a]);

  const clear = useCallback(() => {
    setAState(null);
    setBState(null);
  }, []);

  void durationSec;

  return { a, b, setA, setB, clear, active: a != null && b != null && b > a };
}
