import { useEffect, useRef } from "react";

type LiveRefreshOptions = {
  enabled?: boolean;
  immediate?: boolean;
  intervalMs?: number;
};

export function useLiveRefresh(callback: () => void | Promise<void>, options: LiveRefreshOptions = {}) {
  const { enabled = true, immediate = true, intervalMs = 15000 } = options;
  const callbackRef = useRef(callback);
  const runningRef = useRef(false);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!enabled || typeof window === "undefined") {
      return;
    }

    let mounted = true;

    const run = async () => {
      if (!mounted || runningRef.current) {
        return;
      }

      runningRef.current = true;
      try {
        await callbackRef.current();
      } finally {
        runningRef.current = false;
      }
    };

    if (immediate) {
      void run();
    }

    const intervalId = window.setInterval(() => {
      void run();
    }, intervalMs);

    const handleFocus = () => {
      void run();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void run();
      }
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      mounted = false;
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.clearInterval(intervalId);
    };
  }, [enabled, immediate, intervalMs]);
}
