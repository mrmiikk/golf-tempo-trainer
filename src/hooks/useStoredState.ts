import { useEffect, useState } from "react";

// Persist a small preference value to localStorage. Consolidates a pattern
// that used to be hand-duplicated per setting (a loadX() function plus a
// useEffect writing it back) across several settings in the old
// CameraPractice component.
export function useStoredState<T extends string | number | boolean>(
  key: string,
  fallback: T,
  isValid: (value: unknown) => value is T,
): [T, (value: T) => void] {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null) return fallback;
      const parsed: unknown = typeof fallback === "number" ? Number(raw) : typeof fallback === "boolean" ? raw === "true" : raw;
      return isValid(parsed) ? parsed : fallback;
    } catch {
      return fallback;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, String(value));
    } catch {
      // Storage unavailable or full; the preference simply won't persist.
    }
  }, [key, value]);

  return [value, setValue];
}
