"use client";

import { useMemo, useState } from "react";
import { LUSCHER_COLORS, type LuscherResult } from "@mindsteady/db/client";
import type { SubtestProps } from "../TestRunner";

function shuffled<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export default function LuscherColorTest({ onComplete }: SubtestProps<LuscherResult>) {
  const shuffledColors = useMemo(() => shuffled(LUSCHER_COLORS), []);
  const [order, setOrder] = useState<string[]>([]);

  function pick(id: string) {
    if (order.includes(id)) return;
    const nextOrder = [...order, id];
    setOrder(nextOrder);
    if (nextOrder.length === LUSCHER_COLORS.length) {
      onComplete({ order: nextOrder });
    }
  }

  return (
    <div>
      <p className="hint">Выбирайте карточки по порядку — от наиболее приятного цвета к наименее приятному.</p>
      <div className="miniapp-luscher-grid">
        {shuffledColors.map((color) => {
          const picked = order.includes(color.id);
          return (
            <button
              key={color.id}
              type="button"
              className="miniapp-luscher-swatch"
              style={{ background: color.hex, opacity: picked ? 0.25 : 1 }}
              onClick={() => pick(color.id)}
              disabled={picked}
            >
              {picked && <span className="miniapp-luscher-rank">{order.indexOf(color.id) + 1}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
