import {
  COGNITIVE_TEST_CODE,
  COGNITIVE_TEST_TITLE,
  interpretCognitiveTest,
  cognitiveTestScore,
  type CognitiveTestSubmission,
  BECK_CODE,
  interpretBeck,
  MDQ_CODE,
  interpretMdq,
  mdqScore,
} from "@mindsteady/db";

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

/**
 * Registry of Mini App-driven diagnostic tests. Adding a new test later is
 * a matter of defining its item bank + scoring in packages/db (mirroring
 * cognitive.ts) and registering it here — the submit route and UI runner
 * don't need to change.
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
  [BECK_CODE]: {
    code: BECK_CODE,
    title: "Опросник депрессии Бека",
    interpret: (results: number[]) => {
      const score = results.reduce((a, b) => a + b, 0);
      return { score, interpretation: interpretBeck(score) };
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
};
