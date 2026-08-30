// "Ритм недели" (the `rhythm` unlock): average check-in mood by day of week,
// so a patient can see whether the state runs on a weekly pattern. Pure —
// used by /api/miniapp/progress and the "Моя динамика" screen.

export interface WeekRhythmDay {
  /** Mon..Sun index 0..6. */
  index: number;
  label: string;
  /** Mean mood, -2..2, or null when the day has no entries. */
  moodRaw: number | null;
  /** Same on a 0..100 scale, for the chart. */
  moodPct: number | null;
  n: number;
}

interface CheckInLike {
  date: Date | string;
  mood: number;
}

const LABELS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
// JS getDay(): 0=Sun..6=Sat -> Mon-first 0..6
const toMonFirst = (jsDay: number) => (jsDay + 6) % 7;

export function buildWeekRhythm(checkIns: CheckInLike[]): WeekRhythmDay[] {
  const sum = new Array(7).fill(0);
  const count = new Array(7).fill(0);

  for (const c of checkIns) {
    const i = toMonFirst(new Date(c.date).getDay());
    sum[i] += c.mood;
    count[i] += 1;
  }

  return LABELS.map((label, index) => {
    const n = count[index];
    const moodRaw = n ? Math.round((sum[index] / n) * 100) / 100 : null;
    return {
      index,
      label,
      moodRaw,
      moodPct: moodRaw == null ? null : ((moodRaw + 2) / 4) * 100,
      n,
    };
  });
}
