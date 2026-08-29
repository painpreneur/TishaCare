// "Плотина Тиши" — the dam progression. Rewards the ACT of regular honest
// self-recording, never the content: a check-in with a low mood and missed meds
// counts exactly as much as a bright one. There are no points, no streaks, no
// leaderboards, no "improvement" bonus. Progress only grows; gaps freeze it,
// they never shrink it.
//
// Pure and deterministic, in the shape of apps/web/lib/insights.ts. Copy extends
// the Тиша voice (apps/web/lib/intro.ts) and follows docs/COPY.md: no "—".

const DAY = 24 * 60 * 60 * 1000;

// A qualifying entry is a check-in (any content), a completed reflection
// instrument (balance wheel / any questionnaire — the fact of completing it, not
// the score), or an app-prompted anamnesis / medication-report update. The
// engine only needs the timestamps; the caller maps its rows onto these shapes.
export interface CheckInLike {
  date: Date | string;
}
export interface ResponseLike {
  completedAt: Date | string;
}

export interface DamStageInfo {
  /** 1..6 */
  stage: number;
  code: string;
  title: string;
  /** Frozen into PatientMilestone timeline; shown once when the stage is reached. */
  milestoneCopy: string;
}

export const STAGES: DamStageInfo[] = [
  { stage: 1, code: "first_twig", title: "Первая веточка",   milestoneCopy: "Первая веточка на месте." },
  { stage: 2, code: "weir",       title: "Запруда",           milestoneCopy: "Появилась запруда. Вода начала собираться." },
  { stage: 3, code: "dam",        title: "Крепкая плотина",   milestoneCopy: "Плотина держит крепко." },
  { stage: 4, code: "pond",       title: "Тихий пруд",        milestoneCopy: "За плотиной теперь тихий пруд." },
  { stage: 5, code: "lodge",      title: "Домик",             milestoneCopy: "Домик готов. Есть куда возвращаться." },
  { stage: 6, code: "seasons",    title: "Смена сезонов",     milestoneCopy: "Год наблюдений. Сезоны идут своим чередом." },
];

// stage -> gate. BOTH conditions must hold (cumulative entries AND calendar days
// since the first entry). The day floor is deliberate: a hypomanic burst of 60
// entries in a week still sits at stage 2, because the pond takes calendar time
// to settle. Stage 6 is time only — a full year since the first entry, whatever
// the count. NOTE(review): confirm on seed data that "time only" for stage 6 is
// intended even for a dam that was abandoned at stage 2 months ago.
const THRESHOLDS: { stage: number; entries: number; days: number }[] = [
  { stage: 1, entries: 1,   days: 0 },
  { stage: 2, entries: 7,   days: 7 },
  { stage: 3, entries: 25,  days: 30 },
  { stage: 4, entries: 60,  days: 90 },
  { stage: 5, entries: 120, days: 180 },
  { stage: 6, entries: 0,   days: 365 },
];

export function stageInfo(stage: number): DamStageInfo {
  return STAGES[Math.min(Math.max(stage, 1), STAGES.length) - 1];
}

function toTime(d: Date | string): number {
  return d instanceof Date ? d.getTime() : new Date(d).getTime();
}

function dayKey(t: number): string {
  return new Date(t).toISOString().slice(0, 10);
}

function qualifyingTimes(
  checkIns: CheckInLike[],
  responses: ResponseLike[],
  otherDates: Array<Date | string>,
): number[] {
  return [
    ...checkIns.map((c) => toTime(c.date)),
    ...responses.map((r) => toTime(r.completedAt)),
    ...otherDates.map((d) => toTime(d)),
  ].filter((t) => Number.isFinite(t));
}

/**
 * Distinct UTC calendar days (YYYY-MM-DD) that carry at least one qualifying
 * entry, sorted ascending. Max one per day: three check-ins on one day move the
 * dam by one twig, same as one.
 *
 * `otherDates` carries anamnesis / medication-report timestamps; the caller
 * decides what belongs there so this stays a pure function of its inputs.
 */
export function qualifyingDays(
  checkIns: CheckInLike[],
  responses: ResponseLike[],
  otherDates: Array<Date | string> = [],
): string[] {
  return [...new Set(qualifyingTimes(checkIns, responses, otherDates).map(dayKey))].sort();
}

export function countQualifyingEntries(
  checkIns: CheckInLike[],
  responses: ResponseLike[],
  otherDates: Array<Date | string> = [],
): number {
  return qualifyingDays(checkIns, responses, otherDates).length;
}

/** Earliest qualifying entry as a timestamp, or null when there are none. */
export function firstEntryAt(
  checkIns: CheckInLike[],
  responses: ResponseLike[],
  otherDates: Array<Date | string> = [],
): number | null {
  const times = qualifyingTimes(checkIns, responses, otherDates);
  return times.length ? Math.min(...times) : null;
}

/** Latest qualifying entry as a timestamp, or null when there are none. */
export function lastEntryAt(
  checkIns: CheckInLike[],
  responses: ResponseLike[],
  otherDates: Array<Date | string> = [],
): number | null {
  const times = qualifyingTimes(checkIns, responses, otherDates);
  return times.length ? Math.max(...times) : null;
}

/** Whole days elapsed between the first qualifying entry and `now`. */
export function daysSinceFirstEntry(firstAt: number | null, now: number = Date.now()): number {
  if (firstAt == null) return 0;
  return Math.max(0, Math.floor((now - firstAt) / DAY));
}

/** Qualifying days within the last `windowDays` (default 30), for the status line. */
export function entriesInWindow(
  windowDays: number,
  checkIns: CheckInLike[],
  responses: ResponseLike[],
  otherDates: Array<Date | string> = [],
  now: number = Date.now(),
): number {
  const cutoff = now - windowDays * DAY;
  const recent = qualifyingTimes(checkIns, responses, otherDates).filter((t) => t >= cutoff);
  return new Set(recent.map(dayKey)).size;
}

/**
 * Current dam stage, 1..6: the highest stage whose BOTH gates are satisfied.
 * Returns 1 as the floor — call only when `entryCount >= 1` (a dam with no
 * twigs has no stage to show).
 */
export function damStage(entryCount: number, daysActive: number): number {
  let current = 1;
  for (const t of THRESHOLDS) {
    if (entryCount >= t.entries && daysActive >= t.days) current = t.stage;
  }
  return current;
}

const STATUS_LEAD: Record<number, string> = {
  1: "Веточка на месте.",
  2: "Запруда собирается.",
  3: "Плотина крепнет.",
  4: "Пруд стоит тихо.",
  5: "Домик обжит.",
  6: "Сезоны идут своим чередом.",
};

/** Russian plural for "веточка" (twig). */
function twigs(n: number): string {
  const m100 = n % 100;
  const m10 = n % 10;
  let word: string;
  if (m100 >= 11 && m100 <= 14) word = "веточек";
  else if (m10 === 1) word = "веточка";
  else if (m10 >= 2 && m10 <= 4) word = "веточки";
  else word = "веточек";
  return `${n} ${word}`;
}

/**
 * One calm line under the scene. The 30-day count is descriptive: a plain
 * number of twigs, never a percentage or a target. A quiet month is stated
 * without nudging — the progress is frozen, not lost.
 */
export function damStatusLine(stage: number, entriesLast30: number): string {
  const lead = STATUS_LEAD[stage] ?? STATUS_LEAD[1];
  if (entriesLast30 <= 0) {
    return `${lead} В этом месяце записей пока нет. Продолжим по веточке.`;
  }
  return `${lead} ${twigs(entriesLast30)} за этот месяц.`;
}

/**
 * Shown on the first open after a gap of >= 14 days with no qualifying entry.
 * No guilt, no counter of missed days: the dam held while you were away.
 * Degendered — Тиша never refers to itself with a gendered adjective, and the
 * line never genders the patient.
 */
export function welcomeBackLine(): string {
  return "Ты снова здесь. Продолжим по веточке.";
}

/** Days since the most recent qualifying entry, or null when there are none. */
export function daysSinceLastEntry(lastAt: number | null, now: number = Date.now()): number | null {
  if (lastAt == null) return null;
  return Math.max(0, Math.floor((now - lastAt) / DAY));
}

export const WELCOME_BACK_GAP_DAYS = 14;

export interface DamSnapshot {
  entryCount: number;
  daysActive: number;
  stage: number;
  stageInfo: DamStageInfo;
  entriesLast30: number;
  firstEntryAt: number | null;
  lastEntryAt: number | null;
  daysSinceLastEntry: number | null;
  /** Gap condition only; the UI still gates this on "first open since". */
  welcomeBackDue: boolean;
  statusLine: string;
}

/**
 * Single entry point for DamScene and the post-write recompute. `now` is
 * injectable for deterministic tests and seed backfill.
 */
export function describeDam(
  checkIns: CheckInLike[],
  responses: ResponseLike[],
  otherDates: Array<Date | string> = [],
  now: number = Date.now(),
): DamSnapshot {
  const entryCount = countQualifyingEntries(checkIns, responses, otherDates);
  const first = firstEntryAt(checkIns, responses, otherDates);
  const last = lastEntryAt(checkIns, responses, otherDates);
  const daysActive = daysSinceFirstEntry(first, now);
  const stage = entryCount >= 1 ? damStage(entryCount, daysActive) : 1;
  const entriesLast30 = entriesInWindow(30, checkIns, responses, otherDates, now);
  const sinceLast = daysSinceLastEntry(last, now);
  return {
    entryCount,
    daysActive,
    stage,
    stageInfo: stageInfo(stage),
    entriesLast30,
    firstEntryAt: first,
    lastEntryAt: last,
    daysSinceLastEntry: sinceLast,
    welcomeBackDue: entryCount >= 1 && sinceLast != null && sinceLast >= WELCOME_BACK_GAP_DAYS,
    statusLine: damStatusLine(stage, entriesLast30),
  };
}

/**
 * Stages newly reached at `now` that are above `maxRecordedStage` (the highest
 * stage already frozen in PatientMilestone). The recompute inserts one row per
 * returned stage; @@unique(patientId, stage) keeps it idempotent.
 */
export function newlyReachedStages(
  checkIns: CheckInLike[],
  responses: ResponseLike[],
  otherDates: Array<Date | string> = [],
  maxRecordedStage = 0,
  now: number = Date.now(),
): number[] {
  const { entryCount, stage } = describeDam(checkIns, responses, otherDates, now);
  if (entryCount < 1) return [];
  const out: number[] = [];
  for (let s = maxRecordedStage + 1; s <= stage; s++) out.push(s);
  return out;
}
