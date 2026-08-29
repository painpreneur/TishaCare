import {
  QUESTIONNAIRE_DEFS,
  questionnaireMaxScore,
  interpretByBands,
  MDQ_CODE,
  MDQ_MAX_SCORE,
} from "@tishacare/db";

// Score-over-time series for the patient's "Моя динамика" screen: one per
// questionnaire the patient has completed at least once. Band-defined scales
// (Beck, GAD-7, ASRS, AQ-10, MSI-BPD) come from QUESTIONNAIRE_DEFS; MDQ has no
// def (bespoke criteria), so it is handled as a special case — the line is the
// symptom count (0..13) with a reference line at 7, and the band label reuses
// the stored interpretation.

export interface QScorePoint {
  date: string;
  score: number;
}

export interface QScoreSeries {
  code: string;
  label: string;
  color: string;
  points: QScorePoint[];
  /** Y axis top. */
  max: number;
  /** dashed reference lines (band cut points). */
  thresholds: number[];
  latest: { score: number; band: string; date: string };
}

export interface QResponseInput {
  score: number;
  completedAt: Date | string;
  answers: string;
  questionnaire: { code: string; title: string };
}

const SHORT_LABEL: Record<string, string> = {
  BECK21: "Депрессия",
  GAD7: "Тревога",
  ASRS_A: "Внимание",
  AQ10: "Черты спектра",
  MSI_BPD: "Границы",
  MDQ: "Мания",
};

const COLOR: Record<string, string> = {
  BECK21: "#4f6bfe",
  GAD7: "#f2a93b",
  ASRS_A: "#a35fe0",
  AQ10: "#22b8b0",
  MSI_BPD: "#e0607a",
  MDQ: "#6fbf8f",
};

const ORDER = Object.keys(SHORT_LABEL);

const fmt = (d: Date | string) =>
  new Date(d).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "2-digit" });

function mdqBand(answers: string, score: number): string {
  // The stored `answers` shape varies: an MdqResult saved flat by the seed
  // ({ positive, diagnosis, ... }), or { submission, interpretation } from the
  // submit route. Prefer the boolean → a short label.
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
    const diag =
      p.diagnosis ?? p.interpretation?.diagnosis ?? p.submission?.interpretation?.diagnosis;
    if (typeof diag === "string") return diag;
  } catch {
    // fall through
  }
  return score >= 7 ? "7 и более симптомов" : "менее 7 симптомов";
}

export function buildQuestionnaireSeries(responses: QResponseInput[]): QScoreSeries[] {
  const allowed = new Set([...Object.keys(QUESTIONNAIRE_DEFS), MDQ_CODE]);

  const byCode = new Map<string, QResponseInput[]>();
  for (const r of responses) {
    const code = r.questionnaire.code;
    if (!allowed.has(code)) continue;
    const bucket = byCode.get(code);
    if (bucket) bucket.push(r);
    else byCode.set(code, [r]);
  }

  const out: QScoreSeries[] = [];
  for (const [code, list] of byCode) {
    const sorted = [...list].sort(
      (a, b) => new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime(),
    );
    const last = sorted[sorted.length - 1];

    let max: number;
    let thresholds: number[];
    let band: string;
    if (code === MDQ_CODE) {
      max = MDQ_MAX_SCORE;
      thresholds = [7];
      band = mdqBand(last.answers, last.score);
    } else {
      const def = QUESTIONNAIRE_DEFS[code];
      max = questionnaireMaxScore(def);
      thresholds = def.bands.slice(0, -1).map((b) => b.max);
      band = interpretByBands(def, last.score).label;
    }

    out.push({
      code,
      label: SHORT_LABEL[code] ?? list[0].questionnaire.title,
      color: COLOR[code] ?? "#4f6bfe",
      points: sorted.map((r) => ({ date: fmt(r.completedAt), score: r.score })),
      max,
      thresholds,
      latest: { score: last.score, band, date: fmt(last.completedAt) },
    });
  }

  return out.sort((a, b) => {
    const ai = ORDER.indexOf(a.code);
    const bi = ORDER.indexOf(b.code);
    return (ai < 0 ? 99 : ai) - (bi < 0 ? 99 : bi);
  });
}
