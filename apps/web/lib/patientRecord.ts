// Aggregates for the printable patient record (/dashboard/patients/[id]/export).
// Pure functions only — the Prisma query lives in the page.

export interface CheckInLike {
  date: Date;
  mood: number;
  energyLevel: number | null;
  sleepHours: number | null;
  medsStatus: string | null;
}

export interface CheckInSummary {
  count: number;
  firstDate: Date | null;
  lastDate: Date | null;
  /** mean on the −2…+2 mood scale */
  avgMood: number | null;
  avgEnergy: number | null;
  avgSleep: number | null;
  /** share of check-ins answered "yes" among those that answered the meds question */
  adherencePct: number | null;
  answeredMeds: number;
}

function mean(nums: number[]): number | null {
  if (nums.length === 0) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

export function summarizeCheckIns(checkIns: CheckInLike[]): CheckInSummary {
  if (checkIns.length === 0) {
    return {
      count: 0,
      firstDate: null,
      lastDate: null,
      avgMood: null,
      avgEnergy: null,
      avgSleep: null,
      adherencePct: null,
      answeredMeds: 0,
    };
  }

  const sorted = [...checkIns].sort((a, b) => a.date.getTime() - b.date.getTime());
  const answered = checkIns.filter((c) => c.medsStatus != null);
  const taken = answered.filter((c) => c.medsStatus === "yes").length;

  return {
    count: checkIns.length,
    firstDate: sorted[0].date,
    lastDate: sorted[sorted.length - 1].date,
    avgMood: mean(checkIns.map((c) => c.mood)),
    avgEnergy: mean(checkIns.filter((c) => c.energyLevel != null).map((c) => c.energyLevel as number)),
    avgSleep: mean(checkIns.filter((c) => c.sleepHours != null).map((c) => c.sleepHours as number)),
    adherencePct: answered.length > 0 ? Math.round((taken / answered.length) * 100) : null,
    answeredMeds: answered.length,
  };
}

const MOOD_WORDS = ["очень низкое", "низкое", "ровное", "хорошее", "очень хорошее"];

/** −2…+2 mean mood → a plain-language word. */
export function moodWord(avg: number | null): string | null {
  if (avg == null) return null;
  return MOOD_WORDS[Math.min(4, Math.max(0, Math.round(avg) + 2))] ?? null;
}
