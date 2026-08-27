"use client";

import type { MemorySubtestResult } from "@tishacare/db/client";
import WordRecognitionGrid from "./WordRecognitionGrid";
import type { SubtestProps } from "../TestRunner";

export default function MemoryDelayedRecall({ onComplete }: SubtestProps<MemorySubtestResult>) {
  return (
    <div>
      <p className="hint">Вспомните слова из самого первого задания.</p>
      <WordRecognitionGrid onComplete={onComplete} />
    </div>
  );
}
