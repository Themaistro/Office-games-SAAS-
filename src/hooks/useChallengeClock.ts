"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { countdownSeconds, challengeClockOrigin } from "@/lib/countdown";

export const ChallengeClockScope = createContext<string | null>(null);

export function clearChallengeClock(attemptId: string) {
  try {
    sessionStorage.removeItem(`challenge-clock:${attemptId}`);
  } catch {}
}

/** Pausing rendering/submission never extends the original deadline. */
export function useChallengeClock(
  duration: number,
  enabled = true,
  delay = 0,
  precision = 1,
) {
  const scope = useContext(ChallengeClockScope);
  const origin = useRef<number | null>(null);
  const [remaining, setRemaining] = useState(duration);
  useEffect(() => {
    if (origin.current === null) {
      origin.current = Date.now();
      if (scope) {
        try {
          origin.current = challengeClockOrigin(
            scope,
            origin.current,
            sessionStorage,
          );
        } catch {}
      }
    }
    if (!enabled) return;
    const deadline = origin.current + (delay + duration) * 1000;
    let timer: ReturnType<typeof setInterval> | undefined;
    const update = () => {
      const next = Math.min(
        duration,
        countdownSeconds(deadline, Date.now(), precision),
      );
      setRemaining(next);
      if (next === 0 && timer) clearInterval(timer);
    };
    update();
    if (Date.now() < deadline) timer = setInterval(update, precision * 1000);
    window.addEventListener("focus", update);
    document.addEventListener("visibilitychange", update);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", update);
      document.removeEventListener("visibilitychange", update);
    };
  }, [scope, duration, enabled, delay, precision]);
  return remaining;
}
