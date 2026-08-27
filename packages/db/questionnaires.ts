import { BECK_CODE, BECK_QUESTIONS } from "./clinical";

// Data-driven definition for a sum-of-Likert questionnaire. Covers Beck and,
// later, GAD-7 / ASRS / AQ-10 / MSI-BPD. MDQ keeps its bespoke criteria logic
// in clinical.ts. Interpretation is a set of ascending score bands.

export interface QDefOption {
  label: string;
  value: number;
}
export interface QDefQuestion {
  id: string;
  text: string;
  options: QDefOption[];
}
export interface QDefBand {
  /** Inclusive upper bound of this band. Bands are listed ascending; the last
   *  one is the catch-all (its `max` should equal the questionnaire total). */
  max: number;
  label: string;
  note: string;
}
export interface QuestionnaireDef {
  code: string;
  title: string;
  description: string;
  disclaimer: string;
  questions: QDefQuestion[];
  bands: QDefBand[];
}

export function questionnaireMaxScore(def: QuestionnaireDef): number {
  return def.questions.reduce((sum, q) => sum + Math.max(...q.options.map((o) => o.value)), 0);
}

export function scoreSum(answers: number[]): number {
  return answers.reduce((a, b) => a + (Number.isFinite(b) ? b : 0), 0);
}

export function interpretByBands(def: QuestionnaireDef, score: number): { label: string; note: string } {
  const band = def.bands.find((b) => score <= b.max) ?? def.bands[def.bands.length - 1];
  return { label: band.label, note: band.note };
}

// ── Beck (BDI-21) as a QuestionnaireDef ──────────────────────────────────────
// Bands mirror interpretBeck() in clinical.ts (kept there for back-compat).

export const BECK_DEF: QuestionnaireDef = {
  code: BECK_CODE,
  title: "Опросник депрессии Бека",
  description: "Скрининг выраженности депрессивной симптоматики (21 вопрос)",
  disclaimer:
    "Опросник Бека — скрининговый инструмент. Результат не является диагнозом; " +
    "интерпретируйте его вместе с врачом.",
  questions: BECK_QUESTIONS.map((q, i) => ({ id: `q${i + 1}`, text: q.text, options: q.options })),
  bands: [
    {
      max: 9,
      label: "отсутствие депрессивных симптомов",
      note: "Признаков депрессии не выявлено. Продолжайте заботиться о своем психическом здоровье.",
    },
    {
      max: 15,
      label: "лёгкая депрессия (субдепрессия)",
      note: "Рекомендуется обратить внимание на режим сна, активность и обсудить состояние с врачом при следующем визите.",
    },
    {
      max: 19,
      label: "умеренная депрессия",
      note: "Рекомендуется в ближайшее время обсудить симптомы с лечащим врачом.",
    },
    {
      max: 29,
      label: "выраженная депрессия (средней тяжести)",
      note: "Рекомендуется срочно связаться с лечащим врачом для коррекции терапии.",
    },
    {
      max: 63,
      label: "тяжёлая депрессия",
      note: "Результат указывает на тяжёлое состояние. Пожалуйста, свяжитесь с врачом как можно скорее.",
    },
  ],
};

export const QUESTIONNAIRE_DEFS: Record<string, QuestionnaireDef> = {
  [BECK_DEF.code]: BECK_DEF,
};

export function questionnaireDef(code: string): QuestionnaireDef | null {
  return QUESTIONNAIRE_DEFS[code] ?? null;
}
