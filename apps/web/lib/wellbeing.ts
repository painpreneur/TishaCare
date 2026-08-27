// Shared shaping of check-in rows into the series WellbeingChart draws. Used by
// the doctor patient card and by the patient-facing "Моя динамика" screen so
// both render mood/sleep/energy/meds the same way.

export interface WellbeingPoint {
  date: string;
  moodRaw: number;
  moodPct: number;
  energyRaw: number | null;
  energyPct: number | null;
  sleepRaw: number | null;
  sleepPct: number | null;
  medsRaw: boolean | null;
  medsPct: number | null;
}

interface CheckInInput {
  date: Date | string;
  mood: number;
  sleepHours: number | null;
  energyLevel: number | null;
  medsTaken: boolean | null;
}

// Each metric is normalised to 0–100 so the chart can plot them on one axis;
// the raw values ride along for the tooltip.
export function toWellbeingSeries(checkIns: CheckInInput[]): WellbeingPoint[] {
  return checkIns.map((c) => ({
    date: new Date(c.date).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" }),
    moodRaw: c.mood,
    moodPct: ((c.mood + 2) / 4) * 100,
    energyRaw: c.energyLevel,
    energyPct: c.energyLevel != null ? ((c.energyLevel - 1) / 4) * 100 : null,
    sleepRaw: c.sleepHours,
    sleepPct: c.sleepHours != null ? Math.min((c.sleepHours / 12) * 100, 100) : null,
    medsRaw: c.medsTaken,
    medsPct: c.medsTaken == null ? null : c.medsTaken ? 100 : 0,
  }));
}
