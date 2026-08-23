"use client";

import { useMemo, useRef, useState } from "react";
import { SCHULTE_GRID_SIZE, type SchulteResult } from "@mindsteady/db/client";
import type { SubtestProps } from "../TestRunner";

function shuffledNumbers(count: number): number[] {
  const arr = Array.from({ length: count }, (_, i) => i + 1);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export default function AttentionSchulteTable({ onComplete }: SubtestProps<SchulteResult>) {
  const numbers = useMemo(() => shuffledNumbers(SCHULTE_GRID_SIZE), []);
  const startRef = useRef<number>(performance.now());
  const errorsRef = useRef(0);
  const [tapped, setTapped] = useState<Set<number>>(new Set());
  const [expected, setExpected] = useState(1);

  function tap(n: number) {
    if (tapped.has(n)) return;
    if (n === expected) {
      const nextTapped = new Set(tapped);
      nextTapped.add(n);
      setTapped(nextTapped);
      if (expected === SCHULTE_GRID_SIZE) {
        onComplete({ totalTimeMs: Math.round(performance.now() - startRef.current), errors: errorsRef.current });
        return;
      }
      setExpected(expected + 1);
    } else {
      errorsRef.current += 1;
    }
  }

  return (
    <div>
      <p className="hint">Нажимайте на числа от 1 до {SCHULTE_GRID_SIZE} по порядку. Следующее число: {expected}</p>
      <div className="miniapp-schulte-grid">
        {numbers.map((n) => (
          <button
            key={n}
            type="button"
            className={`miniapp-schulte-cell ${tapped.has(n) ? "done" : ""}`}
            onClick={() => tap(n)}
            disabled={tapped.has(n)}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}
