"use client";

import { useState } from "react";
import { ANALOGY_ITEMS, type AnalogiesResult } from "@tishacare/db/client";
import type { SubtestProps } from "../TestRunner";

export default function ThinkingAnalogies({ onComplete }: SubtestProps<AnalogiesResult>) {
  const [itemIndex, setItemIndex] = useState(0);
  const [picked, setPicked] = useState<string[]>([]);
  const [correctCount, setCorrectCount] = useState(0);

  const item = ANALOGY_ITEMS[itemIndex];

  function toggle(option: string) {
    setPicked((prev) => {
      if (prev.includes(option)) return prev.filter((o) => o !== option);
      if (prev.length >= 2) return prev;
      return [...prev, option];
    });
  }

  function next() {
    const isCorrect =
      picked.length === 2 && item.correct.every((c) => picked.includes(c));
    const nextCorrectCount = correctCount + (isCorrect ? 1 : 0);

    if (itemIndex + 1 >= ANALOGY_ITEMS.length) {
      onComplete({ correctCount: nextCorrectCount, total: ANALOGY_ITEMS.length });
      return;
    }
    setCorrectCount(nextCorrectCount);
    setItemIndex(itemIndex + 1);
    setPicked([]);
  }

  return (
    <div>
      <p className="hint">Выберите 2 слова, наиболее соответствующих понятию.</p>
      <p style={{ fontSize: 18, fontWeight: 600, margin: "12px 0" }}>{item.concept}</p>
      <div className="miniapp-word-grid">
        {item.options.map((option) => (
          <button
            key={option}
            type="button"
            className={`miniapp-word-chip ${picked.includes(option) ? "active" : ""}`}
            onClick={() => toggle(option)}
          >
            {option}
          </button>
        ))}
      </div>
      <button className="btn-primary btn-inline" style={{ marginTop: 16 }} onClick={next} disabled={picked.length !== 2}>
        {itemIndex + 1 >= ANALOGY_ITEMS.length ? "Готово" : "Далее"}
      </button>
    </div>
  );
}
