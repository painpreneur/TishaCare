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
  /** Whole days since the first check-in (week index * 7 for weekly buckets). */
  t: number;
  /** "DD.MM" label for the axis tick. */
  date: string;
  /** Mean mood for the bucket, raw −2…+2. */
  moodRaw: number;
  moodPct: number;
  /** Lowest / highest single mood in the bucket — the day's (or week's) swing. */
  moodMin: number;
  moodMax: number;
  energyRaw: number | null;
  energyPct: number | null;
  sleepRaw: number | null;
  sleepPct: number | null;
  medsRaw: string | null;
  medsPct: number | null;
  /** 0…1 adherence (1=принял, .5=частично, 0=нет), mean over the bucket. */
  medsAdherence: number | null;
  entries: WellbeingEntry[];
  /** Check-ins in the bucket (entries.length for a day; summed for a week). */
  count: number;
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

interface SleepEntryInput {
  date: Date | string;
  hours: number;
}

const DAY = 24 * 60 * 60 * 1000;
const moodPct = (mood: number) => ((mood + 2) / 4) * 100;
const mean = (nums: number[]) => nums.reduce((a, b) => a + b, 0) / nums.length;
const lastNonNull = <T>(vals: (T | null)[]): T | null => {
  for (let i = vals.length - 1; i >= 0; i--) if (vals[i] != null) return vals[i] as T;
  return null;
};

export function toWellbeingSeries(
  checkIns: CheckInInput[],
  sleepEntries: SleepEntryInput[] = [],
): WellbeingPoint[] {
  if (checkIns.length === 0) return [];

  // Explicit sleep-diary hours override the check-in field on the same day.
  const diaryHoursByDay = new Map<string, number>();
  for (const s of sleepEntries) {
    diaryHoursByDay.set(new Date(s.date).toISOString().slice(0, 10), s.hours);
  }

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
    .map(([dayKey, rows]) => {
      const sorted = [...rows].sort((a, b) => a.d.getTime() - b.d.getTime());
      const dayStart = new Date(sorted[0].d);
      dayStart.setHours(0, 0, 0, 0);
      const dayT = Math.round((dayStart.getTime() - origin) / DAY);

      const moods = sorted.map((c) => c.mood);
      const moodMean = mean(moods);
      const energies = sorted.map((c) => c.energyLevel).filter((v): v is number => v != null);
      const sleep = diaryHoursByDay.get(dayKey) ?? lastNonNull(sorted.map((c) => c.sleepHours));
      const meds = lastNonNull(sorted.map((c) => c.medsStatus));
      const medsN = medsToNumber(meds);

      return {
        t: dayT,
        date: dayStart.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" }),
        moodRaw: Math.round(moodMean * 10) / 10,
        moodPct: moodPct(moodMean),
        moodMin: Math.min(...moods),
        moodMax: Math.max(...moods),
        energyRaw: energies.length ? Math.round(mean(energies) * 10) / 10 : null,
        energyPct: energies.length ? ((mean(energies) - 1) / 4) * 100 : null,
        sleepRaw: sleep,
        sleepPct: sleep != null ? Math.min((sleep / 12) * 100, 100) : null,
        medsRaw: meds,
        medsPct: medsN != null ? medsN * 100 : null,
        medsAdherence: medsN,
        count: sorted.length,
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

// Roll daily points into ISO-ish weekly buckets (7 days from the first check-in)
// for long ranges, where 90 daily markers turn the line into noise. Each bucket
// keeps the mean and the week's min/max mood so the swing still reads.
export function aggregateWeekly(points: WellbeingPoint[]): WellbeingPoint[] {
  if (points.length === 0) return [];

  const byWeek = new Map<number, WellbeingPoint[]>();
  for (const p of points) {
    const w = Math.floor(p.t / 7);
    const bucket = byWeek.get(w);
    if (bucket) bucket.push(p);
    else byWeek.set(w, [p]);
  }

  return [...byWeek.entries()]
    .sort(([a], [b]) => a - b)
    .map(([w, ps]) => {
      const moodMeans = ps.map((p) => p.moodRaw);
      const moodMean = mean(moodMeans);
      const energies = ps.map((p) => p.energyRaw).filter((v): v is number => v != null);
      const sleeps = ps.map((p) => p.sleepRaw).filter((v): v is number => v != null);
      const adh = ps.map((p) => p.medsAdherence).filter((v): v is number => v != null);
      const weekStartT = w * 7;
      const label =
        ps[0].date + (ps.length > 1 ? `–${ps[ps.length - 1].date}` : "");

      return {
        t: weekStartT,
        date: label,
        moodRaw: Math.round(moodMean * 10) / 10,
        moodPct: moodPct(moodMean),
        moodMin: Math.min(...ps.map((p) => p.moodMin)),
        moodMax: Math.max(...ps.map((p) => p.moodMax)),
        energyRaw: energies.length ? Math.round(mean(energies) * 10) / 10 : null,
        energyPct: energies.length ? ((mean(energies) - 1) / 4) * 100 : null,
        sleepRaw: sleeps.length ? Math.round(mean(sleeps) * 10) / 10 : null,
        sleepPct: sleeps.length ? Math.min((mean(sleeps) / 12) * 100, 100) : null,
        medsRaw: null,
        medsPct: adh.length ? mean(adh) * 100 : null,
        medsAdherence: adh.length ? mean(adh) : null,
        count: ps.reduce((s, p) => s + p.count, 0),
        entries: [],
      };
    });
}
