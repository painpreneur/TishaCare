// "Колесо баланса" — a self-reflection tool, deliberately NOT a clinical
// instrument: no diagnosis, no validated thresholds, just the patient's own
// sense of how eight areas of life feel right now.

export const BALANCE_WHEEL_CODE = "BALANCE_WHEEL";
export const BALANCE_WHEEL_TITLE = "Колесо баланса";
export const BALANCE_WHEEL_DISCLAIMER =
  "Колесо баланса: инструмент для самоанализа, а не диагностика. Оценки субъективны " +
  "и отражают ваше ощущение здесь и сейчас.";

export const LIFE_AREAS: { id: string; label: string }[] = [
  { id: "health", label: "Здоровье" },
  { id: "work", label: "Работа и карьера" },
  { id: "money", label: "Финансы" },
  { id: "family", label: "Близкие отношения" },
  { id: "friends", label: "Друзья и окружение" },
  { id: "leisure", label: "Отдых и развлечения" },
  { id: "growth", label: "Личностный рост" },
  { id: "meaning", label: "Смысл и ценности" },
];

export interface BalanceWheelResult {
  average: number;
  lowest: string[];
  highest: string[];
  note: string;
}

function clampScore(v: unknown): number {
  const n = Math.round(Number(v));
  if (!Number.isFinite(n)) return 5;
  return Math.min(10, Math.max(1, n));
}

export function interpretBalanceWheel(values: number[]): BalanceWheelResult {
  const vals = LIFE_AREAS.map((_, i) => clampScore(values[i]));
  const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const lowest = LIFE_AREAS.filter((_, i) => vals[i] === min).map((a) => a.label);
  const highest = LIFE_AREAS.filter((_, i) => vals[i] === max).map((a) => a.label);

  const note =
    max - min <= 2
      ? "Сферы жизни ощущаются довольно ровно."
      : `Заметен перекос: слабее всего ${lowest.join(", ")}; сильнее всего ${highest.join(", ")}.`;

  return { average: Math.round(avg * 10) / 10, lowest, highest, note };
}
