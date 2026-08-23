"use client";

import { useState } from "react";
import { SPATIAL_ITEMS, type SpatialColorId, type SpatialResult } from "@mindsteady/db/client";
import type { SubtestProps } from "../TestRunner";

const COLOR_HEX: Record<SpatialColorId, string> = {
  r: "#c73a3a",
  g: "#2e7d52",
  b: "#2f4f9e",
  y: "#e0b93c",
  p: "#7e4f9e",
};

function PatternGrid({ pattern }: { pattern: SpatialColorId[][] }) {
  return (
    <div className="miniapp-pattern-grid">
      {pattern.flat().map((cell, i) => (
        <span key={i} className="miniapp-pattern-cell" style={{ background: COLOR_HEX[cell] }} />
      ))}
    </div>
  );
}

export default function SpatialPatternMatch({ onComplete }: SubtestProps<SpatialResult>) {
  const [itemIndex, setItemIndex] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);

  const item = SPATIAL_ITEMS[itemIndex];

  function pick(isMatch: boolean) {
    const nextCorrectCount = correctCount + (isMatch ? 1 : 0);
    if (itemIndex + 1 >= SPATIAL_ITEMS.length) {
      onComplete({ correctCount: nextCorrectCount, total: SPATIAL_ITEMS.length });
      return;
    }
    setCorrectCount(nextCorrectCount);
    setItemIndex(itemIndex + 1);
  }

  return (
    <div>
      <p className="hint">Выберите узор {"{Б}"}, который совпадает с узором {"{А}"}.</p>
      <p className="hint">Образец:</p>
      <PatternGrid pattern={item.targetPattern} />
      <p className="hint" style={{ marginTop: 16 }}>
        Варианты:
      </p>
      <div className="miniapp-pattern-options">
        {item.options.map((option) => (
          <button key={option.id} type="button" className="miniapp-pattern-option" onClick={() => pick(option.isMatch)}>
            <PatternGrid pattern={option.pattern} />
          </button>
        ))}
      </div>
    </div>
  );
}
