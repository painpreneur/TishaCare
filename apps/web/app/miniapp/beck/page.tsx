"use client";

import { useState } from "react";
import { BECK_CODE, BECK_QUESTIONS, interpretBeck } from "@mindsteady/db/client";
import { miniAppAuthHeaders } from "@/lib/miniappClient";
import QuestionFlow from "@/components/miniapp/QuestionFlow";
import BackLink from "@/components/miniapp/BackLink";

export default function BeckPage() {
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [result, setResult] = useState<{ diagnosis: string; recommendation: string } | null>(null);

  async function answer(value: number) {
    const next = [...answers, value];
    if (index + 1 < BECK_QUESTIONS.length) {
      setAnswers(next);
      setIndex(index + 1);
      return;
    }

    const score = next.reduce((a, b) => a + b, 0);
    await fetch("/api/miniapp/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...miniAppAuthHeaders() },
      body: JSON.stringify({ testCode: BECK_CODE, results: next }),
    });
    setResult(interpretBeck(score));
  }

  if (result) {
    return (
      <div>
        <BackLink />
        <div className="miniapp-card">
          <h1>Опрос завершён</h1>
          <p className="hint">Результат: {result.diagnosis}.</p>
          <p className="hint">{result.recommendation}</p>
        </div>
      </div>
    );
  }

  const question = BECK_QUESTIONS[index];
  return (
    <div>
      <BackLink />
      <QuestionFlow
        index={index}
        total={BECK_QUESTIONS.length}
        question={question.text}
        options={question.options.map((o) => ({ label: o.label, onClick: () => answer(o.value) }))}
      />
    </div>
  );
}
