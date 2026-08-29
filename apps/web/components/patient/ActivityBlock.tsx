"use client";

import type { DamHomeData } from "@/lib/damClient";

// Plain "what you've logged" summary for the home screen: last entry, how many
// of the last 30 days carried one, and which questionnaires have been completed.
// Descriptive only — no assessment, no target.

const DAY = 24 * 60 * 60 * 1000;

function lastEntryLabel(ts: number | null): string {
  if (ts == null) return "записей пока нет";
  const days = Math.floor((Date.now() - ts) / DAY);
  if (days <= 0) return "сегодня";
  if (days === 1) return "вчера";
  return new Date(ts).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function timesWord(n: number): string {
  const m100 = n % 100;
  const m10 = n % 10;
  if (m100 >= 11 && m100 <= 14) return "раз";
  if (m10 === 1) return "раз";
  if (m10 >= 2 && m10 <= 4) return "раза";
  return "раз";
}

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" });

export default function ActivityBlock({ data }: { data: DamHomeData | null }) {
  if (!data) return null;

  return (
    <div className="miniapp-card activity-block">
      <h3>Активность</h3>
      <p className="activity-line">
        Последняя запись: {lastEntryLabel(data.lastEntryAt)}
      </p>
      <p className="activity-line">
        Записи за 30 дней: {data.entriesLast30} из 30 дней
      </p>

      {data.questionnaires.length > 0 && (
        <>
          <p className="hint" style={{ margin: "10px 0 4px" }}>
            Пройденные опросники
          </p>
          <ul className="activity-questionnaires">
            {data.questionnaires.map((q) => (
              <li key={q.code}>
                {q.title}: {q.count} {timesWord(q.count)}, последний {fmtDate(q.lastAt)}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
