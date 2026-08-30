import {
  QUESTIONNAIRE_DEFS,
  questionnaireMaxScore,
  interpretByBands,
  MDQ_CODE,
  MDQ_MAX_SCORE,
  GAD7_CODE,
  ASRS_CODE,
  AQ10_CODE,
  MSI_BPD_CODE,
} from "@tishacare/db";
import type { QResponseInput } from "./questionnaireSeries";

// `baseline` unlock ("Точка отсчёта"): a frozen snapshot of the first-appointment
// screening battery. Once the patient has completed all five intake
// questionnaires at least once, this pins their first score + band for each and
// shows the current value next to it. It is a reference point, not a verdict —
// no "better/worse" colouring, just было -> стало.

// Display order = the order a patient meets them in the intake path.
const INTAKE_ORDER = [MDQ_CODE, GAD7_CODE, ASRS_CODE, AQ10_CODE, MSI_BPD_CODE];

const LABEL: Record<string, string> = {
  [MDQ_CODE]: "Мания (MDQ)",
  [GAD7_CODE]: "Тревога (GAD-7)",
  [ASRS_CODE]: "Внимание (ASRS)",
  [AQ10_CODE]: "Черты спектра (AQ-10)",
  [MSI_BPD_CODE]: "Границы (MSI-BPD)",
};

export interface BaselinePoint {
  score: number;
  band: string;
  date: string;
}

export interface BaselineRow {
  code: string;
  label: string;
  max: number;
  first: BaselinePoint;
  latest: BaselinePoint;
  /** latest.score - first.score; sign is left uninterpreted in the UI. */
  delta: number;
  /** total responses so far (1 = only the baseline, nothing to compare yet) */
  count: number;
}

export interface Baseline {
  rows: BaselineRow[];
  /** the day the battery was completed — latest first-response date across it */
  collectedOn: string;
}

const fmt = (d: Date | string) =>
  new Date(d).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "2-digit" });

function bandFor(code: string, score: number, answers: string): string {
  if (code === MDQ_CODE) {
    try {
      const p = JSON.parse(answers) as Record<string, unknown> & {
        interpretation?: Record<string, unknown>;
        submission?: { interpretation?: Record<string, unknown> };
      };
      const pos =
        p.positive ?? p.interpretation?.positive ?? p.submission?.interpretation?.positive;
      if (typeof pos === "boolean") {
        return pos ? "положительный скрининг" : "отрицательный скрининг";
      }
    } catch {
      // fall through
    }
    return score >= 7 ? "7 и более симптомов" : "менее 7 симптомов";
  }
  const def = QUESTIONNAIRE_DEFS[code];
  return def ? interpretByBands(def, score).label : String(score);
}

function maxFor(code: string): number {
  if (code === MDQ_CODE) return MDQ_MAX_SCORE;
  const def = QUESTIONNAIRE_DEFS[code];
  return def ? questionnaireMaxScore(def) : 0;
}

export function buildBaseline(responses: QResponseInput[]): Baseline | null {
  const byCode = new Map<string, QResponseInput[]>();
  for (const r of responses) {
    const code = r.questionnaire.code;
    if (!INTAKE_ORDER.includes(code)) continue;
    const bucket = byCode.get(code);
    if (bucket) bucket.push(r);
    else byCode.set(code, [r]);
  }

  // The unlock guard already checked this, but stay defensive.
  if (!INTAKE_ORDER.every((code) => byCode.has(code))) return null;

  const rows: BaselineRow[] = [];
  let collected = 0;

  for (const code of INTAKE_ORDER) {
    const list = [...byCode.get(code)!].sort(
      (a, b) => new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime(),
    );
    const first = list[0];
    const last = list[list.length - 1];
    const max = maxFor(code);

    rows.push({
      code,
      label: LABEL[code] ?? code,
      max,
      first: {
        score: first.score,
        band: bandFor(code, first.score, first.answers),
        date: fmt(first.completedAt),
      },
      latest: {
        score: last.score,
        band: bandFor(code, last.score, last.answers),
        date: fmt(last.completedAt),
      },
      delta: last.score - first.score,
      count: list.length,
    });

    collected = Math.max(collected, new Date(first.completedAt).getTime());
  }

  return { rows, collectedOn: fmt(new Date(collected)) };
}
