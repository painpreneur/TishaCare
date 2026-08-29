"use client";

import { useEffect, useState } from "react";
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
// so it is not a plain QuestionnaireDef and cannot use the server-side draft
// endpoint (which is shaped for QuestionnaireDef). Progress is kept in
// localStorage instead, so closing and reopening on the same device resumes
// where the patient left off, like the other questionnaires. Shared by
// /miniapp/mdq and /app/mdq.

const DRAFT_KEY = "tc_mdq_draft";

interface MdqDraft {
  stage: Stage;
  index: number;
  symptomAnswers: boolean[];
  coOccurrence: boolean;
}

function loadDraft(): MdqDraft | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const d = JSON.parse(raw) as MdqDraft;
    if (
      (d.stage === "symptoms" || d.stage === "cooccurrence" || d.stage === "impact") &&
      Array.isArray(d.symptomAnswers) &&
      d.symptomAnswers.every((v) => typeof v === "boolean") &&
      d.symptomAnswers.length <= MDQ_SYMPTOM_QUESTIONS.length &&
      Number.isInteger(d.index) &&
      typeof d.coOccurrence === "boolean"
    ) {
      return d;
    }
  } catch {
    // ignore malformed / unavailable storage
  }
  return null;
}

function saveDraft(d: MdqDraft) {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(d));
  } catch {
    // ignore unavailable storage
  }
}

function clearDraft() {
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch {
    // ignore
  }
}

export default function MdqRunner() {
  const [loaded, setLoaded] = useState(false);
  const [stage, setStage] = useState<Stage>("symptoms");
  const [index, setIndex] = useState(0);
  const [symptomAnswers, setSymptomAnswers] = useState<boolean[]>([]);
  const [coOccurrence, setCoOccurrence] = useState(false);
  const [result, setResult] = useState<{ diagnosis: string; recommendation: string } | null>(null);

  useEffect(() => {
    const d = loadDraft();
    if (d) {
      setStage(d.stage);
      setIndex(Math.min(d.index, MDQ_SYMPTOM_QUESTIONS.length - 1));
      setSymptomAnswers(d.symptomAnswers);
      setCoOccurrence(d.coOccurrence);
    }
    setLoaded(true);
  }, []);

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
    clearDraft();
    setResult(interpretation);
  }

  function answerSymptom(yes: boolean) {
    const next = [...symptomAnswers, yes];
    setSymptomAnswers(next);
    if (index + 1 < MDQ_SYMPTOM_QUESTIONS.length) {
      setIndex(index + 1);
      saveDraft({ stage: "symptoms", index: index + 1, symptomAnswers: next, coOccurrence });
      return;
    }
    setStage("cooccurrence");
    saveDraft({ stage: "cooccurrence", index, symptomAnswers: next, coOccurrence });
  }

  function answerCoOccurrence(yes: boolean) {
    setCoOccurrence(yes);
    setStage("impact");
    saveDraft({ stage: "impact", index, symptomAnswers, coOccurrence: yes });
  }

  if (!loaded) {
    return (
      <div className="miniapp-card">
        <p className="empty">Загрузка...</p>
      </div>
    );
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
          footer={
            <p className="hint">Прогресс сохраняется, можно закрыть и вернуться позже.</p>
          }
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
