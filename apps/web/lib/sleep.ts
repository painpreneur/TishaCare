// Sleep diary helpers, pure data — safe for the client bundle.

export const SLEEP_QUALITY_LABEL: Record<number, string> = {
  1: "плохо",
  2: "так себе",
  3: "нормально",
  4: "хорошо",
  5: "отлично",
};

export const SLEEP_NOTE_MAX = 300;

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

/** Hours between a "HH:MM" bedtime and wake time, crossing midnight if needed.
 *  Returns null if either time is missing or malformed, or the span is absurd. */
export function computeSleepHours(bedtime?: string | null, wakeTime?: string | null): number | null {
  if (!bedtime || !wakeTime || !TIME_RE.test(bedtime) || !TIME_RE.test(wakeTime)) return null;
  const toMin = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  };
  let diff = toMin(wakeTime) - toMin(bedtime);
  if (diff <= 0) diff += 24 * 60; // woke the next day
  const hours = Math.round((diff / 60) * 10) / 10;
  return hours > 0 && hours <= 24 ? hours : null;
}

export function isValidSleepTime(t: unknown): t is string {
  return typeof t === "string" && TIME_RE.test(t);
}

export interface SleepEntryDto {
  date: string; // YYYY-MM-DD
  bedtime: string | null;
  wakeTime: string | null;
  hours: number;
  quality: number | null;
  note: string | null;
}
