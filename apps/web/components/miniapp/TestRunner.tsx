"use client";

import { useState } from "react";
import { miniAppAuthHeaders } from "@/lib/miniappClient";

export interface SubtestProps<TResult = any> {
  onComplete: (result: TResult) => void;
}

export interface SubtestDef {
  key: string;
  title: string;
  category: string;
  Component: React.ComponentType<SubtestProps>;
}

export interface TestRunnerProps {
  testCode: string;
  subtests: SubtestDef[];
  onFinished: (interpretation: any) => void;
}

export default function TestRunner({ testCode, subtests, onFinished }: TestRunnerProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [results, setResults] = useState<Record<string, unknown>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const current = subtests[stepIndex];

  async function handleComplete(result: unknown) {
    const nextResults = { ...results, [current.key]: result };

    if (stepIndex + 1 < subtests.length) {
      setResults(nextResults);
      setStepIndex(stepIndex + 1);
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/miniapp/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...miniAppAuthHeaders() },
        body: JSON.stringify({ testCode, results: nextResults }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      onFinished(data.interpretation);
    } catch {
      setError("Не удалось отправить результаты. Проверьте соединение и попробуйте ещё раз.");
      setSubmitting(false);
    }
  }

  if (submitting) {
    return (
      <div className="miniapp-card">
        <p className="empty">Отправляем результаты...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="miniapp-card">
        <p className="error-text">{error}</p>
      </div>
    );
  }

  return (
    <div className="miniapp-card">
      <div className="miniapp-progress">
        <div
          className="miniapp-progress-bar"
          style={{ width: `${(stepIndex / subtests.length) * 100}%` }}
        />
      </div>
      <p className="hint">
        Задание {stepIndex + 1} из {subtests.length} · {current.category}
      </p>
      <h2>{current.title}</h2>
      <current.Component key={current.key} onComplete={handleComplete} />
    </div>
  );
}
