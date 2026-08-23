"use client";

import { useState } from "react";

/**
 * Legend click-to-filter: from the default "everything shown" state, the first click
 * isolates just that one series. Further clicks toggle individual series in/out of the
 * visible set, so the doctor can build up any subset (e.g. just mood + meds) instead of
 * being stuck viewing exactly one line at a time.
 */
export function useIsolatedLegend(allKeys: string[]) {
  const [hidden, setHidden] = useState<Set<string>>(new Set());

  function toggle(key: string) {
    setHidden((prev) => {
      if (prev.size === 0) {
        return new Set(allKeys.filter((k) => k !== key));
      }
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  function reset() {
    setHidden(new Set());
  }

  function isHidden(key: string) {
    return hidden.has(key);
  }

  return { toggle, reset, isHidden, isFiltered: hidden.size > 0 };
}
