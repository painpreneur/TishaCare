import { pearsonCorrelation, describeCorrelation } from "@/lib/correlation";
import { medsToNumber } from "@/lib/checkin";

// "Связи" — the `connections` unlock. Plain-language read of how sleep, energy
// and medication adherence move together with mood, over all of the patient's
// check-ins. Descriptive only: a link in the patient's own marks, never a cause.

interface CheckInLike {
  mood: number;
  energyLevel: number | null;
  sleepHours: number | null;
  medsStatus: string | null;
}

export interface Connection {
  label: string;
  /** e.g. "умеренная положительная связь" or "заметной связи не видно". */
  strength: string;
  /** number of check-ins that carried the paired value. */
  n: number;
}

function entriesWord(n: number): string {
  const m100 = n % 100;
  const m10 = n % 10;
  if (m100 >= 11 && m100 <= 14) return "записям";
  if (m10 === 1) return "записи";
  return "записям";
}

export function entriesLabel(n: number): string {
  return `по ${n} ${entriesWord(n)}`;
}

function connection(label: string, pairs: [number, number][]): Connection | null {
  const res = pearsonCorrelation(pairs);
  if (!res) return null;
  const strength =
    Math.abs(res.r) < 0.1 ? "заметной связи не видно" : `${describeCorrelation(res.r)} связь`;
  return { label, strength, n: res.n };
}

export function buildConnections(checkIns: CheckInLike[]): Connection[] {
  const sleep = checkIns
    .filter((c) => c.sleepHours != null)
    .map((c) => [c.sleepHours as number, c.mood] as [number, number]);
  const energy = checkIns
    .filter((c) => c.energyLevel != null)
    .map((c) => [c.energyLevel as number, c.mood] as [number, number]);
  const meds = checkIns
    .filter((c) => medsToNumber(c.medsStatus) != null)
    .map((c) => [medsToNumber(c.medsStatus) as number, c.mood] as [number, number]);

  return [
    connection("Сон и настроение", sleep),
    connection("Энергия и настроение", energy),
    connection("Приём препаратов и настроение", meds),
  ].filter((c): c is Connection => c !== null);
}
