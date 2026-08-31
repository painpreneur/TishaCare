"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

// A panel on the doctor's patient page that folds to a single header row. The
// header keeps a one-line summary + a count badge while collapsed, so the page
// scans without opening every block. Open/closed is remembered per doctor in
// localStorage (one map for the whole page), keyed by `id`.
//
// Collapsed content is not mounted — charts and tables only render once opened.
const STORE_KEY = "tc_patient_panels";

function readState(id: string): boolean | undefined {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return undefined;
    const map = JSON.parse(raw) as Record<string, unknown>;
    return typeof map[id] === "boolean" ? (map[id] as boolean) : undefined;
  } catch {
    return undefined;
  }
}

function writeState(id: string, open: boolean) {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    const map = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
    map[id] = open;
    localStorage.setItem(STORE_KEY, JSON.stringify(map));
  } catch {
    // ignore unavailable storage
  }
}

export default function CollapsiblePanel({
  id,
  title,
  summary,
  count,
  countTone,
  defaultOpen = false,
  forceOpen = false,
  children,
}: {
  id: string;
  title: string;
  /** shown, muted, in the header row while collapsed */
  summary?: string;
  /** small badge on the right, both states */
  count?: string | number;
  countTone?: "warn";
  defaultOpen?: boolean;
  /** open on mount and scroll into view, ignoring stored state (deep-link focus) */
  forceOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen || forceOpen);
  // StrictMode invokes the effect twice in dev; only the first read should win
  // so a fast toggle right after mount is not clobbered.
  const restored = useRef(false);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (restored.current) return;
    restored.current = true;
    if (forceOpen) {
      setOpen(true);
      sectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    const saved = readState(id);
    if (saved !== undefined) setOpen(saved);
  }, [id, forceOpen]);

  function toggle() {
    setOpen((prev) => {
      const next = !prev;
      writeState(id, next);
      return next;
    });
  }

  return (
    <section ref={sectionRef} id={id} className={`panel panel--fold ${open ? "is-open" : ""}`}>
      <button
        type="button"
        className="panel__toggle"
        aria-expanded={open}
        onClick={toggle}
      >
        <span className="panel__chev" aria-hidden>
          ▶
        </span>
        <span className="panel__title">{title}</span>
        {!open && summary && <span className="panel__summary">{summary}</span>}
        {count != null && count !== "" && (
          <span className={`panel__count${countTone === "warn" ? " panel__count--warn" : ""}`}>
            {count}
          </span>
        )}
      </button>
      {open && <div className="panel__body">{children}</div>}
    </section>
  );
}
