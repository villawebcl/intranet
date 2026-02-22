"use client";

import { useEffect, useRef, useTransition } from "react";

import { signOutByTimeoutAction } from "@/app/(dashboard)/actions";

type IdleSessionWatcherProps = {
  timeoutMinutes: number;
};

type E2EWindow = Window & {
  __E2E_IDLE_TIMEOUT_MS__?: number;
};

const ACTIVITY_EVENTS: Array<keyof WindowEventMap> = ["click", "keydown", "scroll", "touchstart"];

export function IdleSessionWatcher({ timeoutMinutes }: IdleSessionWatcherProps) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasTimedOutRef = useRef(false);
  const [, startTransition] = useTransition();

  useEffect(() => {
    const e2eOverrideMs =
      typeof window !== "undefined" ? (window as E2EWindow).__E2E_IDLE_TIMEOUT_MS__ : undefined;
    const timeoutMs =
      typeof e2eOverrideMs === "number" && Number.isFinite(e2eOverrideMs) && e2eOverrideMs > 0
        ? e2eOverrideMs
        : Math.max(timeoutMinutes, 5) * 60 * 1000;
    let active = true;

    const clearTimer = () => {
      if (!timeoutRef.current) {
        return;
      }

      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    };

    const handleTimeout = async () => {
      if (!active || hasTimedOutRef.current) {
        return;
      }

      hasTimedOutRef.current = true;
      startTransition(() => {
        void signOutByTimeoutAction();
      });
    };

    const resetTimer = () => {
      clearTimer();
      timeoutRef.current = setTimeout(handleTimeout, timeoutMs);
    };

    ACTIVITY_EVENTS.forEach((eventName) => window.addEventListener(eventName, resetTimer, { passive: true }));
    resetTimer();

    return () => {
      active = false;
      clearTimer();
      ACTIVITY_EVENTS.forEach((eventName) => window.removeEventListener(eventName, resetTimer));
    };
  }, [startTransition, timeoutMinutes]);

  return null;
}
