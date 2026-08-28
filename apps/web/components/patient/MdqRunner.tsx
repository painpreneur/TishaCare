"use client";

import { useState } from "react";
import {
  MDQ_CODE,
  MDQ_CO_OCCURRENCE_QUESTION,
  MDQ_IMPACT_OPTIONS,
  MDQ_IMPACT_QUESTION,
  MDQ_SYMPTOM_QUESTIONS,
  interpretMdq,
} from "@tishacare/db/client";
import { miniAppAuthHeaders } from "@/lib/miniappClient";
import QuestionFlow from "@/components/miniapp/QuestionFlow";
import BackLink from "@/components/miniapp/BackLink";

type Stage = "symptoms" | "cooccurrence" | "impact";

// MDQ keeps bespoke criteria logic (symptom count + co-occurrence + impact),
// so it is not a plain QuestionnaireDef. Shared by /miniapp/mdq and /app/mdq.
export default function MdqRunner() {
  const [stage, setStage] = useState<Stage>("symptoms");
  const [index, setIndex] = useState(0);
  const [symptomAnswers, setSymptomAnswers] = useState<boolean[]>([]);
  const [coOccurrence, setCoOccurrence] = useState(false);
  const [result, setResult] = useState<{ diagnosis: string; recommendation: string } | null>(null);

  async function finish(impact: number, finalCoOccurrence: boolean) {
    const interpretation = interpretMdq(symptomAnswers, finalCoOccurrence, impact);
    await fetch("/api/miniapp/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...miniAppAuthHeaders() },
      body: JSON.stringify({
        testCode: MDQ_CODE,
        results: { symptomAnswers, coOccurrence: finalCoOccurrence, impact },
      }),
    });
    setResult(interpretation);
  }

  function answerSymptom(yes: boolean) {
    const next = [...symptomAnswers, yes];
    if (index + 1 < MDQ_SYMPTOM_QUESTIONS.length) {
      setSymptomAnswers(next);
      setIndex(index + 1);
      return;
    }
    setSymptomAnswers(next);
    setStage("cooccurrence");
  }

  function answerCoOccurrence(yes: boolean) {
    setCoOccurrence(yes);
    setStage("impact");
  }

  if (result) {
    return (
      <div>
        <BackLink />
        <div className="miniapp-card">
          <h1>Опрос завершён</h1>
          <p className="hint">Результат: {result.diagnosis}.</p>
          <p className="hint">{result.recommendation}</p>
          <p className="hint">Напоминание: MDQ это скрининговый, а не диагностический инструмент.</p>
        </div>
      </div>
    );
  }

  if (stage === "symptoms") {
    return (
      <div>
        <BackLink />
        <QuestionFlow
          index={index}
          total={MDQ_SYMPTOM_QUESTIONS.length}
          question={MDQ_SYMPTOM_QUESTIONS[index]}
          options={[
            { label: "Да", onClick: () => answerSymptom(true) },
            { label: "Нет", onClick: () => answerSymptom(false) },
          ]}
        />
      </div>
    );
  }

  if (stage === "cooccurrence") {
    return (
      <div>
        <BackLink />
        <div className="miniapp-card">
          <h2>{MDQ_CO_OCCURRENCE_QUESTION}</h2>
          <div className="miniapp-question-options">
            <button className="miniapp-option-btn" onClick={() => answerCoOccurrence(true)}>
              Да
            </button>
            <button className="miniapp-option-btn" onClick={() => answerCoOccurrence(false)}>
              Нет
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <BackLink />
      <div className="miniapp-card">
        <h2>{MDQ_IMPACT_QUESTION}</h2>
        <div className="miniapp-question-options">
          {MDQ_IMPACT_OPTIONS.map((o) => (
            <button key={o.value} className="miniapp-option-btn" onClick={() => finish(o.value, coOccurrence)}>
              {o.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
