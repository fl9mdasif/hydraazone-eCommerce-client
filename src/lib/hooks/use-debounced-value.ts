"use client";

import { useEffect, useState } from "react";

/**
 * Delays reflecting `value` until it's stopped changing for `delayMs` —
 * used to turn a search box into "type and it searches" instead of
 * "type, then press Enter". `setDebounced` only ever runs inside the
 * `setTimeout` callback, never synchronously in the effect body, so this
 * doesn't trip `react-hooks/set-state-in-effect`.
 */
export function useDebouncedValue<T>(value: T, delayMs = 400): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timeout = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timeout);
  }, [value, delayMs]);

  return debounced;
}
