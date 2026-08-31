"use client";

import { useEffect, useState } from "react";

// A plain "make the text bigger" control for the doctor panel — A− / A / A+.
// It scales the whole panel via CSS `zoom` on `.doc-panel` (see globals.css),
// so px-sized layouts scale together. The choice is per-browser, in
// localStorage; the layout also sets it before first paint to avoid a jump.
const LEVELS = ["s", "m", "l"] as const;
type Level = (typeof LEVELS)[number];
const STORE_KEY = "tc_doc_scale";

function isLevel(v: unknown): v is Level {
  return v === "s" || v === "m" || v === "l";
}

function apply(level: Level) {
  document.querySelector(".doc-panel")?.setAttribute("data-doc-scale", level);
  try {
    localStorage.setItem(STORE_KEY, level);
  } catch {
    // ignore unavailable storage
  }
}

export default function DashboardScaleControl() {
  const [level, setLevel] = useState<Level>("s");

  useEffect(() => {
    let saved: Level = "s";
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (isLevel(raw)) saved = raw;
    } catch {
      // ignore
    }
    setLevel(saved);
    document.querySelector(".doc-panel")?.setAttribute("data-doc-scale", saved);
  }, []);

  function change(next: Level) {
    setLevel(next);
    apply(next);
  }

  function step(delta: number) {
    change(LEVELS[Math.min(LEVELS.length - 1, Math.max(0, LEVELS.indexOf(level) + delta))]);
  }

  return (
    <div className="doc-scale" role="group" aria-label="Размер текста">
      <button
        type="button"
        className="doc-scale-btn"
        onClick={() => step(-1)}
        disabled={level === "s"}
        aria-label="Мельче"
        title="Мельче"
      >
        А<span className="doc-scale-sign">−</span>
      </button>
      <button
        type="button"
        className="doc-scale-btn doc-scale-reset"
        onClick={() => change("s")}
        disabled={level === "s"}
        aria-label="Обычный размер"
        title="Обычный размер"
      >
        А
      </button>
      <button
        type="button"
        className="doc-scale-btn"
        onClick={() => step(1)}
        disabled={level === "l"}
        aria-label="Крупнее"
        title="Крупнее"
      >
        А<span className="doc-scale-sign">+</span>
      </button>
    </div>
  );
}
