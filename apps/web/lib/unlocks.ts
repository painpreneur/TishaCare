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
  /** Shown under the title in the "Открытия" list once earned, and in the card. */
  copy: string;
  /** Shown, dimmed, next to a not-yet-earned unlock. A plain statement of the
   *  trigger — no nudge, no "N of M". */
  lockedHint: string;
  /** Whether earning it pops a one-time "Тиша заметил…" card. Cosmetic unlocks
   *  (seasons) still appear in the list but do not interrupt. */
  card: boolean;
}

export const UNLOCKS: UnlockInfo[] = [
  {
    code: "connections",
    title: "Связи",
    copy: "Записей уже хватает, чтобы посмотреть, что с чем связано.",
    lockedHint: "Откроется после 7 записей.",
    card: true,
  },
  {
    code: "balance",
    title: "История колеса баланса",
    copy: "Колесо теперь можно сравнивать во времени.",
    lockedHint: "Откроется, когда пройдёте колесо баланса.",
    card: true,
  },
  {
    code: "compare",
    title: "Шкалы рядом",
    copy: "Пять опросников позади, теперь их видно рядом.",
    lockedHint: "Откроется после 5 опросников.",
    card: true,
  },
  {
    code: "baseline",
    title: "Точка отсчёта",
    copy: "Есть с чем сравнивать дальше.",
    lockedHint: "Откроется, когда пройдёте все опросники к первому приёму.",
    card: true,
  },
  {
    code: "rhythm",
    title: "Ритм недели",
    copy: "Стало видно, как состояние ходит по неделе.",
    lockedHint: "Откроется после 30 записей.",
    card: true,
  },
  {
    code: "year",
    title: "Год назад",
    copy: "Год наблюдений. Можно оглянуться.",
    lockedHint: "Откроется через год после первой записи.",
    card: true,
  },
  {
    code: "seasons",
    title: "Сезоны у плотины",
    copy: "Сцена у плотины теперь отзывается на время года.",
    lockedHint: "Откроется на стадии «Крепкая плотина».",
    card: false,
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

// ---- "Открытия", staged ------------------------------------------------------
//
// The flat list reads better as two parts. Block A is a pre-appointment path:
// a short, ordered checklist a patient can actually finish before the first
// visit, and here — unlike a locked unlock — step progress IS shown, because it
// is an explicit onboarding task, not a hidden mechanic. Block B is the
// long-haul unlocks (volume / time / dam stage): no order, no counters.

export interface PathStep {
  id: string;
  title: string;
  /** plain statement of the act; shown while not done */
  hint: string;
  done: boolean;
  /** progress within a multi-part step, e.g. "3 из 5" (Block A only, while not done) */
  detail?: string;
  /** unlock codes this step grants once done (titles via unlockInfo) */
  grants: string[];
}

export interface PathBlockBItem {
  code: string;
  title: string;
  copy: string;
  lockedHint: string;
  open: boolean;
}

export interface PatientPath {
  blockA: PathStep[];
  blockAComplete: boolean;
  blockB: PathBlockBItem[];
}

const BLOCK_B_CODES = ["rhythm", "seasons", "year"];

export function buildPath(ctx: UnlockContext): PatientPath {
  const has = (code: string) => ctx.completedCodes.has(code);
  const intakeDone = INTAKE_CODES.filter(has).length;
  const intakeAll = intakeDone >= INTAKE_CODES.length;

  // "Неделя записей" is last on purpose: it is the slowest of the four to
  // accumulate, so it should not sit above the acts a patient can finish in one
  // sitting.
  const blockA: PathStep[] = [
    {
      id: "first-entry",
      title: "Первая запись состояния",
      hint: "Одна отметка о том, как дела",
      done: ctx.qualifyingEntryCount >= 1,
      grants: [],
    },
    {
      id: "wheel",
      title: "Колесо баланса пройдено",
      hint: "Восемь сфер жизни по разу",
      done: has(BALANCE_WHEEL_CODE),
      grants: ["balance"],
    },
    {
      id: "intake",
      title: "Скрининговые опросники к приёму",
      hint: "MDQ, тревога, внимание, черты спектра, границы",
      done: intakeAll,
      detail: intakeAll ? undefined : `${intakeDone} из ${INTAKE_CODES.length}`,
      grants: ["baseline", "compare"],
    },
    {
      id: "week",
      title: "Неделя записей",
      hint: "Семь дней с отметкой о состоянии",
      done: ctx.qualifyingEntryCount >= 7,
      detail: ctx.qualifyingEntryCount >= 7 ? undefined : `${Math.min(ctx.qualifyingEntryCount, 7)} из 7`,
      grants: ["connections"],
    },
  ];

  const earned = evaluateUnlocks(ctx);
  const blockB: PathBlockBItem[] = BLOCK_B_CODES.map((code) => {
    const info = unlockInfo(code);
    return {
      code,
      title: info?.title ?? code,
      copy: info?.copy ?? "",
      lockedHint: info?.lockedHint ?? "",
      open: earned.includes(code),
    };
  });

  return { blockA, blockAComplete: blockA.every((s) => s.done), blockB };
}
