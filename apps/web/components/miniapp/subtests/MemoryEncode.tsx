"use client";

import { useEffect, useState } from "react";
import { MEMORY_WORD_LIST, type MemorySubtestResult } from "@tishacare/db/client";
import WordRecognitionGrid from "./WordRecognitionGrid";
import type { SubtestProps } from "../TestRunner";

const SHOW_SECONDS = 15;

export default function MemoryEncode({ onComplete }: SubtestProps<MemorySubtestResult>) {
  const [secondsLeft, setSecondsLeft] = useState(SHOW_SECONDS);
  const [showing, setShowing] = useState(true);

  useEffect(() => {
    if (secondsLeft <= 0) {
      setShowing(false);
      return;
    }
    const timer = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [secondsLeft]);

  if (showing) {
    return (
      <div>
        <p className="hint">Постарайтесь запомнить эти слова ({secondsLeft}с):</p>
        <div className="miniapp-word-grid">
          {MEMORY_WORD_LIST.map((word) => (
            <span key={word} className="miniapp-word-chip static">
              {word}
            </span>
          ))}
        </div>
      </div>
    );
  }

  return <WordRecognitionGrid onComplete={onComplete} />;
}
