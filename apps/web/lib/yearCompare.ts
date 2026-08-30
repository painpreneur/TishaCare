// "Год назад" (the `year` unlock): the last two weeks' average check-in mood
// next to the same fortnight a year ago. Pure — used by /api/miniapp/progress
// and the "Моя динамика" screen.

export interface YearCompare {
  nowAvg: number | null; // mean mood -2..2 over the recent window
  nowN: number;
  thenAvg: number | null; // same window one year back
  thenN: number;
}

interface CheckInLike {
  date: Date | string;
  mood: number;
}

const DAY = 24 * 60 * 60 * 1000;
const WINDOW_DAYS = 14;
// A year back, with a few days' slack so a sparse week still lands something.
const YEAR_BACK_DAYS = 365;
const SLACK_DAYS = 3;

function avg(checkIns: CheckInLike[], fromMs: number, toMs: number) {
  const moods = checkIns
    .filter((c) => {
      const t = new Date(c.date).getTime();
      return t >= fromMs && t <= toMs;
    })
    .map((c) => c.mood);
  if (moods.length === 0) return { avg: null as number | null, n: 0 };
  return { avg: Math.round((moods.reduce((a, b) => a + b, 0) / moods.length) * 100) / 100, n: moods.length };
}

export function buildYearCompare(checkIns: CheckInLike[], now: Date = new Date()): YearCompare {
  const nowMs = now.getTime();
  const recent = avg(checkIns, nowMs - WINDOW_DAYS * DAY, nowMs);
  const then = avg(
    checkIns,
    nowMs - (YEAR_BACK_DAYS + WINDOW_DAYS / 2 + SLACK_DAYS) * DAY,
    nowMs - (YEAR_BACK_DAYS - WINDOW_DAYS / 2 - SLACK_DAYS) * DAY,
  );
  return { nowAvg: recent.avg, nowN: recent.n, thenAvg: then.avg, thenN: then.n };
}
