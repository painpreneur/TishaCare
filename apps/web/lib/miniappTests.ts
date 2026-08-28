import {
  COGNITIVE_TEST_CODE,
  COGNITIVE_TEST_TITLE,
  interpretCognitiveTest,
  cognitiveTestScore,
  type CognitiveTestSubmission,
  MDQ_CODE,
  interpretMdq,
  mdqScore,
  QUESTIONNAIRE_DEFS,
  scoreSum,
  interpretByBands,
  BALANCE_WHEEL_CODE,
  BALANCE_WHEEL_TITLE,
  interpretBalanceWheel,
} from "@tishacare/db";

export interface MiniAppTestDef<TResults = any> {
  code: string;
  title: string;
  interpret: (results: TResults) => { score: number; interpretation: unknown };
}

interface MdqSubmission {
  symptomAnswers: boolean[];
  coOccurrence: boolean;
  impact: number;
}

// Every sum-of-Likert questionnaire (Beck, GAD-7, ASRS, AQ-10, MSI-BPD) is
// scored the same way from its QuestionnaireDef — the item bank + bands live in
// packages/db/questionnaires.ts, nothing here changes when one is added.
const scaleTests: Record<string, MiniAppTestDef> = Object.fromEntries(
  Object.values(QUESTIONNAIRE_DEFS).map((def) => [
    def.code,
    {
      code: def.code,
      title: def.title,
      interpret: (results: number[]) => {
        const score = scoreSum(results);
        const band = interpretByBands(def, score);
        return {
          score,
          interpretation: {
            diagnosis: band.label,
            recommendation: band.note,
            disclaimer: def.disclaimer,
            attribution: def.attribution ?? null,
          },
        };
      },
    },
  ])
);

/**
 * Registry of Mini App-driven diagnostic tests. The cognitive battery and MDQ
 * have bespoke scoring; the sum-scale questionnaires come from QUESTIONNAIRE_DEFS.
 */
export const MINIAPP_TESTS: Record<string, MiniAppTestDef> = {
  [COGNITIVE_TEST_CODE]: {
    code: COGNITIVE_TEST_CODE,
    title: COGNITIVE_TEST_TITLE,
    interpret: (results: CognitiveTestSubmission) => {
      const interpretation = interpretCognitiveTest(results);
      return { score: cognitiveTestScore(interpretation), interpretation };
    },
  },
  [MDQ_CODE]: {
    code: MDQ_CODE,
    title: "MDQ (Mood Disorder Questionnaire)",
    interpret: (results: MdqSubmission) => {
      const interpretation = interpretMdq(results.symptomAnswers, results.coOccurrence, results.impact);
      return { score: mdqScore(interpretation), interpretation };
    },
  },
  [BALANCE_WHEEL_CODE]: {
    code: BALANCE_WHEEL_CODE,
    title: BALANCE_WHEEL_TITLE,
    interpret: (results: number[]) => ({
      score: results.reduce((a, b) => a + (Number(b) || 0), 0),
      interpretation: interpretBalanceWheel(results),
    }),
  },
  ...scaleTests,
};
