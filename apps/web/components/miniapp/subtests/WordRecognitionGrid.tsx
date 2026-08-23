"use client";

import { useMemo, useState } from "react";
import { MEMORY_WORD_LIST, MEMORY_DISTRACTOR_WORDS, type MemorySubtestResult } from "@mindsteady/db/client";

function shuffled<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export default function WordRecognitionGrid({
  onComplete,
}: {
  onComplete: (result: MemorySubtestResult) => void;
}) {
  const words = useMemo(() => shuffled([...MEMORY_WORD_LIST, ...MEMORY_DISTRACTOR_WORDS]), []);
  const [selected, setSelected] = useState<string[]>([]);

  function toggle(word: string) {
    setSelected((prev) => (prev.includes(word) ? prev.filter((w) => w !== word) : [...prev, word]));
  }

  function finish() {
    const correctCount = selected.filter((w) => MEMORY_WORD_LIST.includes(w)).length;
    onComplete({ selected, correctCount });
  }

  return (
    <div>
      <p className="hint">Отметьте слова, которые вы видели ранее.</p>
      <div className="miniapp-word-grid">
        {words.map((word) => (
          <button
            key={word}
            type="button"
            className={`miniapp-word-chip ${selected.includes(word) ? "active" : ""}`}
            onClick={() => toggle(word)}
          >
            {word}
          </button>
        ))}
      </div>
      <button className="btn-primary btn-inline" style={{ marginTop: 16 }} onClick={finish}>
        Готово
      </button>
    </div>
  );
}
