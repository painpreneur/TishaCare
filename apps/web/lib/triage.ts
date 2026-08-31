import { MDQ_CODE, MDQ_MAX_SCORE, PHQ9_CODE, PHQ9_ITEM9_INDEX } from "@tishacare/db";
import { isPoorlyTolerated } from "@/lib/medication";

// Deterministic per-patient triage for the doctor's dashboard. Every flag is a
// plain statement of what the self-report data shows, and each says why it is
// there. Not a diagnosis, not a score.

const DAY = 24 * 60 * 60 * 1000;

// Thresholds — kept here so they are easy to tune in one place.
export const NO_CHECKIN_DAYS = 4; // silence this long is worth surfacing
export const MOOD_DROP = 0.7; // drop in the −2…+2 weekly average
export const MEDS_MISSED_MIN = 2; // "not taken" days in the last week

export interface TriageFlag {
  kind:
    | "silent"
    | "mood_drop"
    | "meds_missed"
    | "poor_tolerability"
    | "mdq_positive"
    | "phq9_self_harm";
  label: string;
}

export interface TriageInput {
  checkIns: { date: Date; mood: number; medsStatus: string | null }[];
  responses: { score: number; completedAt: Date; answers: string; questionnaire: { code: string } }[];
  medications: { reports: { tolerability: number | null }[] }[];
}

/** Reads the PHQ-9 item-9 (self-harm / suicidal ideation) answer from a stored
 *  response's `answers` JSON, or null if it can't be read. */
function phq9Item9(answers: string): number | null {
  try {
    const parsed = JSON.parse(answers);
    const submission = Array.isArray(parsed) ? parsed : parsed?.submission;
    const v = Array.isArray(submission) ? submission[PHQ9_ITEM9_INDEX] : null;
    return typeof v === "number" ? v : null;
  } catch {
    return null;
  }
}

export interface TriageResult {
  flags: TriageFlag[];
  /** Most recent moment we heard anything from this patient (ms), or null. */
  lastSignalAt: number | null;
}

function avg(nums: number[]): number | null {
  return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : null;
}

function dayWord(n: number): string {
  const m100 = n % 100;
  const m10 = n % 10;
  if (m100 >= 11 && m100 <= 14) return `${n} дней`;
  if (m10 === 1) return `${n} день`;
  if (m10 >= 2 && m10 <= 4) return `${n} дня`;
  return `${n} дней`;
}

export function assessPatient(input: TriageInput): TriageResult {
  const now = Date.now();
  const flags: TriageFlag[] = [];

  const checkIns = [...input.checkIns].sort((a, b) => b.date.getTime() - a.date.getTime());
  const latestCheckIn = checkIns[0] ?? null;

  // 1. Silence.
  if (!latestCheckIn) {
    flags.push({ kind: "silent", label: "Ни одного чек-ина" });
  } else {
    const ageDays = Math.floor((now - latestCheckIn.date.getTime()) / DAY);
    if (ageDays >= NO_CHECKIN_DAYS) {
      flags.push({ kind: "silent", label: `Нет чек-ина ${dayWord(ageDays)}` });
    }
  }

  // 2. Mood drop, last 7 days vs the 7 before (each window needs ≥3 entries).
  const inWindow = (d: Date, from: number, to: number) =>
    d.getTime() >= now - from * DAY && d.getTime() < now - to * DAY;
  const last7 = input.checkIns.filter((c) => inWindow(c.date, 7, 0));
  const prev7 = input.checkIns.filter((c) => inWindow(c.date, 14, 7));
  const moodNow = last7.length >= 3 ? avg(last7.map((c) => c.mood)) : null;
  const moodPrev = prev7.length >= 3 ? avg(prev7.map((c) => c.mood)) : null;
  if (moodNow != null && moodPrev != null && moodNow - moodPrev <= -MOOD_DROP) {
    flags.push({
      kind: "mood_drop",
      label: `Настроение ниже на ~${(moodPrev - moodNow).toFixed(1)} п. за неделю`,
    });
  }

  // 3. Missed medication over the last week.
  const medsMissed = last7.filter((c) => c.medsStatus === "no").length;
  if (medsMissed >= MEDS_MISSED_MIN) {
    flags.push({
      kind: "meds_missed",
      label: `Препараты не приняты в ${dayWord(medsMissed)} за неделю`,
    });
  }

  // 4. Poorly tolerated active medication.
  if (input.medications.some((m) => m.reports.some((r) => isPoorlyTolerated(r.tolerability)))) {
    flags.push({ kind: "poor_tolerability", label: "Плохая переносимость препарата" });
  }

  // 5. Latest MDQ is a positive screen.
  const latestMdq = input.responses
    .filter((r) => r.questionnaire.code === MDQ_CODE)
    .sort((a, b) => b.completedAt.getTime() - a.completedAt.getTime())[0];
  if (latestMdq && latestMdq.score >= 7) {
    flags.push({
      kind: "mdq_positive",
      label: `MDQ положительный (${latestMdq.score}/${MDQ_MAX_SCORE})`,
    });
  }

  // 6. Latest PHQ-9 flags item 9 (thoughts of self-harm / being better off dead).
  const latestPhq9 = input.responses
    .filter((r) => r.questionnaire.code === PHQ9_CODE)
    .sort((a, b) => b.completedAt.getTime() - a.completedAt.getTime())[0];
  if (latestPhq9) {
    const item9 = phq9Item9(latestPhq9.answers);
    if (item9 != null && item9 >= 1) {
      flags.push({
        kind: "phq9_self_harm",
        label: "PHQ-9: отмечены мысли о самоповреждении — свяжитесь с пациентом",
      });
    }
  }

  const signals = [
    latestCheckIn?.date.getTime(),
    ...input.responses.map((r) => r.completedAt.getTime()),
  ].filter((t): t is number => typeof t === "number");
  const lastSignalAt = signals.length ? Math.max(...signals) : null;

  return { flags, lastSignalAt };
}
