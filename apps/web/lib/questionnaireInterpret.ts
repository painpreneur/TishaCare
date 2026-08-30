import {
  BECK_CODE,
  BECK_MAX_SCORE,
  MDQ_CODE,
  MDQ_MAX_SCORE,
  COGNITIVE_TEST_CODE,
  COGNITIVE_TEST_MAX_SCORE,
  BALANCE_WHEEL_CODE,
  interpretBeck,
  interpretByBands,
  MdqResult,
  CognitiveTestInterpretation,
  QUESTIONNAIRE_DEFS,
  questionnaireMaxScore,
} from "@tishacare/db";

// Top of scale per questionnaire code, for "балл / максимум" rendering.
export const QUESTIONNAIRE_MAX_SCORE: Record<string, number> = {
  [BECK_CODE]: BECK_MAX_SCORE,
  [MDQ_CODE]: MDQ_MAX_SCORE,
  [COGNITIVE_TEST_CODE]: COGNITIVE_TEST_MAX_SCORE,
  ...Object.fromEntries(
    Object.values(QUESTIONNAIRE_DEFS).map((def) => [def.code, questionnaireMaxScore(def)]),
  ),
};

// A one-line clinical interpretation of a stored questionnaire response.
// Shared by the doctor's patient page and the printable record.
export function describeResponse(code: string, score: number, answersJson: string): string {
  if (code === BECK_CODE) {
    return interpretBeck(score).diagnosis;
  }
  if (code === MDQ_CODE) {
    try {
      return (JSON.parse(answersJson) as MdqResult).diagnosis;
    } catch {
      return "·";
    }
  }
  if (code === COGNITIVE_TEST_CODE) {
    try {
      const { interpretation } = JSON.parse(answersJson) as {
        interpretation: CognitiveTestInterpretation;
      };
      return interpretation.summary;
    } catch {
      return "·";
    }
  }
  if (QUESTIONNAIRE_DEFS[code]) {
    return interpretByBands(QUESTIONNAIRE_DEFS[code], score).label;
  }
  if (code === BALANCE_WHEEL_CODE) {
    try {
      const { interpretation } = JSON.parse(answersJson) as { interpretation: { note: string } };
      return interpretation.note;
    } catch {
      return "·";
    }
  }
  return "·";
}
