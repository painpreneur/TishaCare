import {
  BECK_CODE,
  GAD7_CODE,
  ASRS_CODE,
  AQ10_CODE,
  MSI_BPD_CODE,
  MDQ_CODE,
  BALANCE_WHEEL_CODE,
} from "@tishacare/db/client";

// "Открытия": a feature or view that appears once the patient has done a
// qualifying act enough times. Not a trophy — every trigger is an act (recorded,
// completed, days elapsed), never a score, an improvement, or a streak. Once
// earned an unlock stays; there is no counter shown for a locked one.
//
// Pure and deterministic, in the shape of apps/web/lib/gamification.ts. Copy
// extends the Тиша voice (apps/web/lib/intro.ts) and follows docs/COPY.md.

export interface UnlockInfo {
  code: string;
  title: string;
  /** One-time "Тиша заметил…" card copy. null = no card (cosmetic unlock). */
  copy: string | null;
  /** Shown, dimmed, next to a not-yet-earned unlock. A plain statement of the
   *  trigger — no nudge, no "N of M". */
  lockedHint: string;
}

export const UNLOCKS: UnlockInfo[] = [
  {
    code: "connections",
    title: "Связи",
    copy: "Записей уже хватает, чтобы посмотреть, что с чем связано.",
    lockedHint: "Откроется после 7 записей.",
  },
  {
    code: "balance",
    title: "История колеса баланса",
    copy: "Колесо теперь можно сравнивать во времени.",
    lockedHint: "Откроется, когда пройдёте колесо баланса.",
  },
  {
    code: "compare",
    title: "Шкалы рядом",
    copy: "Пять опросников позади, теперь их видно рядом.",
    lockedHint: "Откроется после 5 опросников.",
  },
  {
    code: "baseline",
    title: "Точка отсчёта",
    copy: "Есть с чем сравнивать дальше.",
    lockedHint: "Откроется, когда пройдёте все опросники к первому приёму.",
  },
  {
    code: "rhythm",
    title: "Ритм недели",
    copy: "Стало видно, как состояние ходит по неделе.",
    lockedHint: "Откроется после 30 записей.",
  },
  {
    code: "year",
    title: "Год назад",
    copy: "Год наблюдений. Можно оглянуться.",
    lockedHint: "Откроется через год после первой записи.",
  },
  {
    code: "seasons",
    title: "Сезоны у плотины",
    copy: null,
    lockedHint: "Откроется на стадии «Крепкая плотина».",
  },
];

export function unlockInfo(code: string): UnlockInfo | undefined {
  return UNLOCKS.find((u) => u.code === code);
}

// Scales that show up in the "Моя динамика" selector. "5 опросников" for the
// `compare` unlock counts these — a balance wheel or cognitive test does not
// help "put two scales side by side".
const SCALE_CODES = new Set<string>([
  BECK_CODE,
  GAD7_CODE,
  ASRS_CODE,
  AQ10_CODE,
  MSI_BPD_CODE,
  MDQ_CODE,
]);

// The first-appointment screening battery.
const INTAKE_CODES = [MDQ_CODE, GAD7_CODE, ASRS_CODE, AQ10_CODE, MSI_BPD_CODE];

export interface UnlockContext {
  /** describeDam().entryCount — qualifying days, max one per day. */
  qualifyingEntryCount: number;
  /** describeDam().daysActive. */
  daysSinceFirstEntry: number;
  /** describeDam().stage, 1..6. */
  damStage: number;
  /** All distinct questionnaire codes the patient has ever completed. */
  completedCodes: Set<string>;
  /** Total responses among SCALE_CODES (retakes count). */
  scaleResponseCount: number;
}

/** Codes the patient currently qualifies for. */
export function evaluateUnlocks(c: UnlockContext): string[] {
  const out: string[] = [];
  if (c.qualifyingEntryCount >= 7) out.push("connections");
  if (c.completedCodes.has(BALANCE_WHEEL_CODE)) out.push("balance");
  if (c.scaleResponseCount >= 5) out.push("compare");
  if (INTAKE_CODES.every((code) => c.completedCodes.has(code))) out.push("baseline");
  if (c.qualifyingEntryCount >= 30) out.push("rhythm");
  if (c.daysSinceFirstEntry >= 365) out.push("year");
  if (c.damStage >= 3) out.push("seasons");
  return out;
}

/** Codes newly earned relative to what is already recorded. */
export function newlyUnlocked(ctx: UnlockContext, already: Iterable<string>): string[] {
  const have = new Set(already);
  return evaluateUnlocks(ctx).filter((code) => !have.has(code));
}

/** Build the context from raw questionnaire response codes + a dam snapshot. */
export function unlockContext(
  responseCodes: string[],
  snapshot: { entryCount: number; daysActive: number; stage: number },
): UnlockContext {
  return {
    qualifyingEntryCount: snapshot.entryCount,
    daysSinceFirstEntry: snapshot.daysActive,
    damStage: snapshot.stage,
    completedCodes: new Set(responseCodes),
    scaleResponseCount: responseCodes.filter((c) => SCALE_CODES.has(c)).length,
  };
}
