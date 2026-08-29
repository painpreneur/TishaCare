"use client";

import { useEffect, useState } from "react";
import {
  QuestionnaireDef,
  scoreSum,
  interpretByBands,
  questionnaireMaxScore,
} from "@tishacare/db/client";
import { miniAppAuthHeaders } from "@/lib/miniappClient";
import BackLink from "@/components/miniapp/BackLink";

// Runs any QuestionnaireDef: one question at a time, a Back button, and an
// autosaved draft so the patient can leave and resume.
export default function QuestionnaireRunner({ def }: { def: QuestionnaireDef }) {
  const total = def.questions.length;
  const [answers, setAnswers] = useState<number[]>([]);
  const [index, setIndex] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    fetch(`/api/miniapp/questionnaires/${def.code}/draft`, { headers: miniAppAuthHeaders() })
      .then((r) => r.json())
      .then((d) => {
        if (!active) return;
        if (d.draft && Array.isArray(d.draft.answers)) {
          setAnswers(d.draft.answers);
          setIndex(Math.min(d.draft.lastIndex ?? d.draft.answers.length, total - 1));
        }
        setLoaded(true);
      })
      .catch(() => active && setLoaded(true));
    return () => {
      active = false;
    };
  }, [def.code, total]);

  function saveDraft(nextAnswers: number[], nextIndex: number) {
    fetch(`/api/miniapp/questionnaires/${def.code}/draft`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...miniAppAuthHeaders() },
      body: JSON.stringify({ answers: nextAnswers, lastIndex: nextIndex }),
    }).catch(() => {});
  }

  function discardDraft() {
    fetch(`/api/miniapp/questionnaires/${def.code}/draft`, {
      method: "DELETE",
      headers: miniAppAuthHeaders(),
    }).catch(() => {});
  }

  async function answer(value: number) {
    const next = [...answers];
    next[index] = value;

    if (index + 1 < total) {
      setAnswers(next);
      setIndex(index + 1);
      saveDraft(next, index + 1);
      return;
    }

    setSubmitting(true);
    setAnswers(next);
    await fetch("/api/miniapp/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...miniAppAuthHeaders() },
      body: JSON.stringify({ testCode: def.code, results: next }),
    });
    discardDraft();
    setResult(scoreSum(next));
    setSubmitting(false);
  }

  function back() {
    if (index === 0) return;
    setIndex(index - 1);
    saveDraft(answers, index - 1);
  }

  function restart() {
    setAnswers([]);
    setIndex(0);
    discardDraft();
  }

  if (!loaded) {
    return (
      <div className="miniapp-card">
        <p className="empty">Загрузка...</p>
      </div>
    );
  }

  if (result != null) {
    const interp = interpretByBands(def, result);
    return (
      <div>
        <BackLink />
        <div className="miniapp-card">
          <h1>Опрос завершён</h1>
          <p className="hint">
            Результат: {interp.label} ({result} из {questionnaireMaxScore(def)}).
          </p>
          <p className="hint">{interp.note}</p>
          <p className="hint" style={{ marginTop: 12 }}>{def.disclaimer}</p>
          {def.attribution && (
            <p className="hint" style={{ marginTop: 6, fontSize: 11 }}>{def.attribution}</p>
          )}
        </div>
      </div>
    );
  }

  const q = def.questions[index];
  const started = index > 0 || answers.some((a) => a != null);

  return (
    <div>
      <BackLink />
      <div className="miniapp-card">
        <div className="miniapp-progress">
          <div className="miniapp-progress-bar" style={{ width: `${(index / total) * 100}%` }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <p className="hint">
            Вопрос {index + 1} из {total}
          </p>
          {index > 0 && (
            <button className="link-btn" onClick={back} disabled={submitting}>
              ← Назад
            </button>
          )}
        </div>
        <h2>{q.text}</h2>
        <div className="miniapp-question-options">
          {q.options.map((o, i) => (
            <button
              // Key by question index too: the option buttons remount on every
              // question, so the browser focus ring does not linger on the
              // button at the same position and read as a carried-over answer.
              key={`${index}-${i}`}
              type="button"
              className={`miniapp-option-btn ${answers[index] === o.value ? "active" : ""}`}
              onClick={() => answer(o.value)}
              disabled={submitting}
            >
              {o.label}
            </button>
          ))}
        </div>
        {started && (
          <button className="link-btn" style={{ marginTop: 12 }} onClick={restart} disabled={submitting}>
            Начать заново
          </button>
        )}
        <p className="hint" style={{ marginTop: 8 }}>
          Прогресс сохраняется, можно закрыть и вернуться позже.
        </p>
      </div>
    </div>
  );
}
