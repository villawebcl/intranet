"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef } from "react";

import { createSupabaseBrowserClient } from "@/lib/supabase/browser-client";

type IdleSessionWatcherProps = {
  timeoutMinutes: number;
};

const ACTIVITY_EVENTS: Array<keyof WindowEventMap> = ["click", "keydown", "scroll", "touchstart"];

export function IdleSessionWatcher({ timeoutMinutes }: IdleSessionWatcherProps) {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const timeoutMs = Math.max(timeoutMinutes, 5) * 60 * 1000;
    let active = true;

    const clearTimer = () => {
      if (!timeoutRef.current) {
        return;
      }

      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    };

    const handleTimeout = async () => {
      if (!active) {
        return;
      }

      await supabase.auth.signOut();
      router.replace("/login?reason=timeout");
      router.refresh();
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
  }, [router, supabase, timeoutMinutes]);

  return null;
}
