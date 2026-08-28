import {
  QUESTIONNAIRE_DEFS,
  interpretByBands,
  BECK_CODE,
  MDQ_CODE,
} from "@tishacare/db";

// Deterministic, descriptive observations for the doctor's card. Every line is
// a plain statement of what the self-report data shows — never a diagnosis.

interface CheckInLike {
  date: Date | string;
  mood: number;
  sleepHours: number | null;
  medsStatus: string | null;
}
interface ResponseLike {
  score: number;
  completedAt: Date | string;
  questionnaire: { code: string; title: string };
}

const DAY = 24 * 60 * 60 * 1000;

function avg(nums: number[]): number | null {
  return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : null;
}

function days(n: number): string {
  const mod100 = n % 100;
  const mod10 = n % 10;
  if (mod100 >= 11 && mod100 <= 14) return `${n} дней`;
  if (mod10 === 1) return `${n} день`;
  if (mod10 >= 2 && mod10 <= 4) return `${n} дня`;
  return `${n} дней`;
}

export function buildPatientInsights(checkIns: CheckInLike[], responses: ResponseLike[]): string[] {
  const out: string[] = [];
  const now = Date.now();
  const inWindow = (d: Date | string, from: number, to: number) => {
    const t = new Date(d).getTime();
    return t >= now - from * DAY && t < now - to * DAY;
  };

  const last7 = checkIns.filter((c) => inWindow(c.date, 7, 0));
  const prev7 = checkIns.filter((c) => inWindow(c.date, 14, 7));

  // Mood shift, last 7 days vs the 7 before (needs enough data in both windows).
  const moodNow = last7.length >= 3 ? avg(last7.map((c) => c.mood)) : null;
  const moodPrev = prev7.length >= 3 ? avg(prev7.map((c) => c.mood)) : null;
  if (moodNow != null && moodPrev != null) {
    const delta = moodNow - moodPrev;
    if (Math.abs(delta) >= 0.7) {
      out.push(
        `Настроение ${delta < 0 ? "ниже" : "выше"} на ~${Math.abs(delta).toFixed(1)} п. ` +
          `к предыдущей неделе (по шкале −2…+2).`
      );
    }
  }

  // Missed check-ins in the last 7 days.
  const daysWithCheckIn = new Set(
    last7.map((c) => new Date(c.date).toISOString().slice(0, 10))
  ).size;
  const missed = 7 - daysWithCheckIn;
  if (missed >= 2) {
    out.push(`${days(missed)} без чек-ина за последнюю неделю.`);
  }

  // Short sleep.
  const shortSleep = last7.filter((c) => c.sleepHours != null && c.sleepHours < 6).length;
  if (shortSleep >= 3) {
    out.push(`Сон менее 6 часов в ${shortSleep} из ${last7.length} отмеченных дней недели.`);
  }

  // Missed medication.
  const medsMissed = last7.filter((c) => c.medsStatus === "no").length;
  if (medsMissed >= 2) {
    out.push(`Препараты отмечены как не принятые в ${days(medsMissed)} из последней недели.`);
  }

  // Scale increases that cross into a higher band.
  const byCode = new Map<string, ResponseLike[]>();
  for (const r of responses) {
    const arr = byCode.get(r.questionnaire.code) ?? [];
    arr.push(r);
    byCode.set(r.questionnaire.code, arr);
  }
  for (const [code, list] of byCode) {
    if (list.length < 2) continue;
    const sorted = [...list].sort(
      (a, b) => new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime()
    );
    const prev = sorted[sorted.length - 2];
    const latest = sorted[sorted.length - 1];
    if (latest.score <= prev.score) continue;

    const def = QUESTIONNAIRE_DEFS[code];
    if (def) {
      const before = interpretByBands(def, prev.score).label;
      const after = interpretByBands(def, latest.score).label;
      if (before !== after) {
        out.push(
          `${latest.questionnaire.title}: балл вырос ${prev.score}→${latest.score} (${before} → ${after}).`
        );
      }
    } else if (code === BECK_CODE || code === MDQ_CODE) {
      if (latest.score - prev.score >= 4) {
        out.push(`${latest.questionnaire.title}: балл вырос ${prev.score}→${latest.score}.`);
      }
    }
  }

  return out;
}
