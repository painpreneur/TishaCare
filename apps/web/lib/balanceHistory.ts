import { LIFE_AREAS, BALANCE_WHEEL_CODE } from "@tishacare/db/client";

// History of the patient's "Колесо баланса" runs, for the `balance` unlock:
// the raw eight values per run so the "Моя динамика" screen can lay two wheels
// over each other and show a per-area "было -> стало". Not clinical — the wheel
// is a self-reflection tool (see packages/db/lifeBalance.ts).

/** Short axis labels, aligned to LIFE_AREAS order — the full labels are too long
 *  for a radar chart. */
export const BALANCE_AREA_SHORT = [
  "Здоровье",
  "Работа",
  "Финансы",
  "Близкие",
  "Друзья",
  "Отдых",
  "Рост",
  "Смысл",
];

export interface BalanceWheelEntry {
  date: string; // dd.mm.yy
  values: number[]; // 8, aligned to LIFE_AREAS
  average: number;
}

export interface BalanceAreaDelta {
  label: string; // short
  first: number;
  latest: number;
  delta: number; // latest - first
}

export interface BalanceHistory {
  entries: BalanceWheelEntry[]; // chronological
  areas: BalanceAreaDelta[]; // per LIFE_AREAS, first run vs latest run
}

export interface BalanceResponseInput {
  completedAt: Date | string;
  answers: string;
  questionnaire: { code: string };
}

const fmt = (d: Date | string) =>
  new Date(d).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "2-digit" });

function clamp(v: unknown): number {
  const n = Math.round(Number(v));
  if (!Number.isFinite(n)) return 5;
  return Math.min(10, Math.max(1, n));
}

// The wheel is stored as a QuestionnaireResponse; `answers` is either
// { submission: number[8], interpretation } (submit route) or, from older seed
// data, a bare array.
function parseValues(answers: string): number[] | null {
  try {
    const p = JSON.parse(answers);
    const raw = Array.isArray(p) ? p : p?.submission;
    if (!Array.isArray(raw) || raw.length < LIFE_AREAS.length) return null;
    return LIFE_AREAS.map((_, i) => clamp(raw[i]));
  } catch {
    return null;
  }
}

export function buildBalanceHistory(responses: BalanceResponseInput[]): BalanceHistory {
  const entries: BalanceWheelEntry[] = responses
    .filter((r) => r.questionnaire.code === BALANCE_WHEEL_CODE)
    .map((r) => ({ at: new Date(r.completedAt).getTime(), values: parseValues(r.answers) }))
    .filter((r): r is { at: number; values: number[] } => r.values !== null)
    .sort((a, b) => a.at - b.at)
    .map((r) => ({
      date: fmt(new Date(r.at)),
      values: r.values,
      average: Math.round((r.values.reduce((s, v) => s + v, 0) / r.values.length) * 10) / 10,
    }));

  const first = entries[0];
  const latest = entries[entries.length - 1];
  const areas: BalanceAreaDelta[] = first
    ? BALANCE_AREA_SHORT.map((label, i) => ({
        label,
        first: first.values[i],
        latest: latest.values[i],
        delta: latest.values[i] - first.values[i],
      }))
    : [];

  return { entries, areas };
}
