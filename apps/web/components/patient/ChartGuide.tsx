"use client";

import { useEffect, useRef, useState } from "react";

// "Как читать график" for the mood tab of «Моя динамика». Expanded on the
// first visit, collapsed (one tap to reopen) after that. The disclaimer line
// stays visible in both states.

const SEEN_KEY = "tc.chartGuide.seen";

const ROWS: { swatch: "line" | "band" | "bar" | "dot"; text: string }[] = [
  { swatch: "line", text: "Линия — настроение по дням." },
  { swatch: "band", text: "Полоса вокруг линии — разброс за день, если отмечались несколько раз." },
  { swatch: "bar", text: "Столбики снизу — часы сна." },
  { swatch: "dot", text: "Точки — приём препаратов: зелёная приняты, жёлтая частично, пустая пропуск." },
];

export default function ChartGuide() {
  const [open, setOpen] = useState(true);
  const decided = useRef(false);

  useEffect(() => {
    // Ref guards against React StrictMode's double-invoke in dev, which would
    // otherwise write the key on the first run and collapse on the second.
    if (decided.current) return;
    decided.current = true;
    try {
      if (localStorage.getItem(SEEN_KEY) === "1") setOpen(false);
      else localStorage.setItem(SEEN_KEY, "1");
    } catch {
      // storage blocked — just leave it open this time
    }
  }, []);

  return (
    <div className="chart-guide">
      <button
        type="button"
        className="chart-guide-toggle"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        Как читать график
        <span className={`chart-guide-caret ${open ? "up" : ""}`} aria-hidden="true">
          ⌄
        </span>
      </button>

      {open && (
        <ul className="chart-guide-rows">
          {ROWS.map((r) => (
            <li key={r.swatch}>
              <span className={`chart-guide-swatch sw-${r.swatch}`} aria-hidden="true" />
              <span>{r.text}</span>
            </li>
          ))}
          <li>
            <span className="chart-guide-swatch sw-none" aria-hidden="true" />
            <span>Кнопка «Показать энергию» добавляет линию энергии.</span>
          </li>
        </ul>
      )}

      <p className="hint" style={{ marginTop: open ? 10 : 6 }}>
        Это ваши отметки, не оценка и не диагноз.
      </p>
    </div>
  );
}
