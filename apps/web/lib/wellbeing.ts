// Shared shaping of check-in rows into the series WellbeingChart draws. Used by
// the doctor patient card and by the patient-facing "Моя динамика" screen so
// both render mood/sleep/energy/meds the same way.
//
// Check-ins can be logged several times a day. Each day becomes one point on a
// numeric time axis (mean mood/energy, the day's sleep/meds); the individual
// entries ride along in `entries` at their own fractional-day position, so
// within-day swings (a low morning, a high evening) show as separate dots.

import { parseStateTags, medsToNumber } from "./checkin";

export interface WellbeingEntry {
  /** Days since the first check-in, plus the time of day as a fraction. */
  t: number;
  /** "HH:MM" of this check-in. */
  time: string;
  moodRaw: number;
  moodPct: number;
  tags: string[];
  note: string | null;
}

export interface WellbeingPoint {
  /** Whole days since the first check-in. */
  t: number;
  /** "DD.MM" label for the axis tick. */
  date: string;
  moodRaw: number;
  moodPct: number;
  energyRaw: number | null;
  energyPct: number | null;
  sleepRaw: number | null;
  sleepPct: number | null;
  medsRaw: string | null;
  medsPct: number | null;
  entries: WellbeingEntry[];
}

interface CheckInInput {
  date: Date | string;
  mood: number;
  stateTags?: string | null;
  note?: string | null;
  sleepHours: number | null;
  energyLevel: number | null;
  medsStatus: string | null;
}

const DAY = 24 * 60 * 60 * 1000;
const moodPct = (mood: number) => ((mood + 2) / 4) * 100;
const mean = (nums: number[]) => nums.reduce((a, b) => a + b, 0) / nums.length;
const lastNonNull = <T>(vals: (T | null)[]): T | null => {
  for (let i = vals.length - 1; i >= 0; i--) if (vals[i] != null) return vals[i] as T;
  return null;
};

export function toWellbeingSeries(checkIns: CheckInInput[]): WellbeingPoint[] {
  if (checkIns.length === 0) return [];

  const withDates = checkIns.map((c) => ({ ...c, d: new Date(c.date) }));
  const originMs = new Date(Math.min(...withDates.map((c) => c.d.getTime())));
  originMs.setHours(0, 0, 0, 0);
  const origin = originMs.getTime();

  const byDay = new Map<string, typeof withDates>();
  for (const c of withDates) {
    const key = c.d.toISOString().slice(0, 10);
    const bucket = byDay.get(key);
    if (bucket) bucket.push(c);
    else byDay.set(key, [c]);
  }

  return [...byDay.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, rows]) => {
      const sorted = [...rows].sort((a, b) => a.d.getTime() - b.d.getTime());
      const dayStart = new Date(sorted[0].d);
      dayStart.setHours(0, 0, 0, 0);
      const dayT = Math.round((dayStart.getTime() - origin) / DAY);

      const moodMean = mean(sorted.map((c) => c.mood));
      const energies = sorted.map((c) => c.energyLevel).filter((v): v is number => v != null);
      const sleep = lastNonNull(sorted.map((c) => c.sleepHours));
      const meds = lastNonNull(sorted.map((c) => c.medsStatus));
      const medsN = medsToNumber(meds);

      return {
        t: dayT,
        date: dayStart.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" }),
        moodRaw: Math.round(moodMean * 10) / 10,
        moodPct: moodPct(moodMean),
        energyRaw: energies.length ? Math.round(mean(energies) * 10) / 10 : null,
        energyPct: energies.length ? ((mean(energies) - 1) / 4) * 100 : null,
        sleepRaw: sleep,
        sleepPct: sleep != null ? Math.min((sleep / 12) * 100, 100) : null,
        medsRaw: meds,
        medsPct: medsN != null ? medsN * 100 : null,
        entries: sorted.map((c) => ({
          t: dayT + (c.d.getTime() - dayStart.getTime()) / DAY,
          time: c.d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }),
          moodRaw: c.mood,
          moodPct: moodPct(c.mood),
          tags: parseStateTags(c.stateTags),
          note: c.note ?? null,
        })),
      };
    });
}
