"use client";

import { useEffect, useState } from "react";
import { miniAppAuthHeaders } from "@/lib/miniappClient";
import type { WellbeingPoint } from "@/lib/wellbeing";
import WellbeingChart from "@/components/WellbeingChart";
import BackLink from "@/components/miniapp/BackLink";

const RANGES = [7, 30, 90];

// Patient-facing view of their own check-in trend. Same chart the doctor sees,
// no clinical interpretation — just "here's what you logged".
export default function ProgressChart() {
  const [days, setDays] = useState(30);
  const [series, setSeries] = useState<WellbeingPoint[] | null>(null);

  useEffect(() => {
    let active = true;
    setSeries(null);
    fetch(`/api/miniapp/progress?days=${days}`, { headers: miniAppAuthHeaders() })
      .then((res) => res.json())
      .then((data) => {
        if (active) setSeries(data.series ?? []);
      })
      .catch(() => {
        if (active) setSeries([]);
      });
    return () => {
      active = false;
    };
  }, [days]);

  return (
    <div>
      <BackLink />
      <div className="miniapp-card">
        <h1>Моя динамика</h1>
        <p className="hint">
          Здесь видно, как за последнее время менялись настроение, сон и энергия. Это не оценка
          и не диагноз — просто ваши отметки на графике.
        </p>
        <div className="miniapp-word-grid" style={{ margin: "12px 0" }}>
          {RANGES.map((r) => (
            <button
              key={r}
              type="button"
              className={`miniapp-word-chip ${days === r ? "active" : ""}`}
              onClick={() => setDays(r)}
            >
              {r} дней
            </button>
          ))}
        </div>
        {series === null ? <p className="empty">Загрузка...</p> : <WellbeingChart data={series} />}
      </div>
    </div>
  );
}
