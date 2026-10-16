import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "lgh-reduce-motion";

function readStoredPreference(): boolean | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === "1") return true;
    if (raw === "0") return false;
    return null;
  } catch {
    return null;
  }
}

/**
 * Combines the OS-level `prefers-reduced-motion` signal with an explicit
 * site preference the guest can toggle in the footer. Either source alone
 * stops the hero video; the manual flag is boolean-only (no personal data)
 * and, per WCAG, is a convenience — not proof of compliance on its own.
 */
export function useMotionPreference() {
  const [systemReduced, setSystemReduced] = useState(
    () => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
  );
  const [manualReduce, setManualReduce] = useState<boolean>(() => readStoredPreference() ?? false);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handleChange = (event: MediaQueryListEvent) => setSystemReduced(event.matches);
    query.addEventListener("change", handleChange);
    return () => query.removeEventListener("change", handleChange);
  }, []);

  const setManualPreference = useCallback((reduce: boolean) => {
    setManualReduce(reduce);
    try {
      window.localStorage.setItem(STORAGE_KEY, reduce ? "1" : "0");
    } catch {
      // Private browsing or disabled storage — the in-memory state still applies for this session.
    }
  }, []);

  return {
    reduceMotion: systemReduced || manualReduce,
    manualReduce,
    setManualPreference,
  };
}
