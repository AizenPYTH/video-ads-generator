import { useCallback, useEffect, useState } from "react";

/** Local-storage backed state that degrades to in-memory when storage is
 *  unavailable (private windows, blocked site data). */
export function useLocalStorage<T>(
  key: string,
  initialValue: T,
): [T, (value: T) => void] {
  const [stored, setStored] = useState<T>(() => {
    try {
      const raw = window.localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : initialValue;
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(stored));
    } catch {
      // Nothing to do - the value stays in memory for this session.
    }
  }, [key, stored]);

  const set = useCallback((value: T) => setStored(value), []);
  return [stored, set];
}
