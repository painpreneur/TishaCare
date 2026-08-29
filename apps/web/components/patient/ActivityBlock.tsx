"use client";

import type { DamHomeData } from "@/lib/damClient";

// Small "when did I last log, how often lately" summary for the home screen.
// Deliberately minimal — descriptive, no assessment.

const DAY = 24 * 60 * 60 * 1000;

function lastEntryLabel(ts: number | null): string {
  if (ts == null) return "записей пока нет";
  const days = Math.floor((Date.now() - ts) / DAY);
  if (days <= 0) return "сегодня";
  if (days === 1) return "вчера";
  return new Date(ts).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export default function ActivityBlock({ data }: { data: DamHomeData | null }) {
  if (!data) return null;

  return (
    <div className="miniapp-card activity-block">
      <h3>Активность</h3>
      <p className="activity-line">Последняя запись: {lastEntryLabel(data.lastEntryAt)}</p>
      <p className="activity-line">Записи за 30 дней: {data.entriesLast30} из 30 дней</p>
    </div>
  );
}
