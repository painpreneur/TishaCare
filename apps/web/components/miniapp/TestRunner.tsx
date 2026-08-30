"use client";

import { useState } from "react";
import Link from "next/link";
import { miniAppAuthHeaders } from "@/lib/miniappClient";
import { usePatientHomeHref } from "@/lib/patientPortal";

export interface SubtestProps<TResult = any> {
  onComplete: (result: TResult) => void;
}

export interface SubtestDef {
  key: string;
  title: string;
  category: string;
  /** Shown on the "ready?" screen before the subtest mounts. A few timed
   *  subtests start their clock on mount, so the patient reads this first and
   *  the timer only starts on "Начать". */
  description: string;
  Component: React.ComponentType<SubtestProps>;
}

export interface TestRunnerProps {
  testCode: string;
  subtests: SubtestDef[];
  onFinished: (interpretation: any) => void;
}

export default function TestRunner({ testCode, subtests, onFinished }: TestRunnerProps) {
  const homeHref = usePatientHomeHref();
  const [stepIndex, setStepIndex] = useState(0);
  const [started, setStarted] = useState(false);
  const [confirmStop, setConfirmStop] = useState(false);
  const [results, setResults] = useState<Record<string, unknown>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const current = subtests[stepIndex];

  async function handleComplete(result: unknown) {
    const nextResults = { ...results, [current.key]: result };

    if (stepIndex + 1 < subtests.length) {
      setResults(nextResults);
      setStepIndex(stepIndex + 1);
      setStarted(false);
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

  if (confirmStop) {
    return (
      <div className="miniapp-card">
        <h2>Прервать тест?</h2>
        <p className="hint" style={{ marginTop: 8 }}>
          Ответы на пройденные задания не сохранятся. Тест можно будет начать заново в любой момент.
        </p>
        <div className="test-stop-actions">
          <Link href={homeHref} className="btn-primary btn-inline">
            Прервать и выйти
          </Link>
          <button type="button" className="link-btn" onClick={() => setConfirmStop(false)}>
            Продолжить тест
          </button>
        </div>
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
      <div className="test-runner-head">
        <p className="hint" style={{ margin: 0 }}>
          Задание {stepIndex + 1} из {subtests.length} · {current.category}
        </p>
        <button type="button" className="link-btn" onClick={() => setConfirmStop(true)}>
          Прервать
        </button>
      </div>
      <h2>{current.title}</h2>
      {started ? (
        <current.Component key={current.key} onComplete={handleComplete} />
      ) : (
        <>
          <p className="hint" style={{ marginTop: 8 }}>{current.description}</p>
          <button
            type="button"
            className="btn-primary btn-inline"
            style={{ marginTop: 16 }}
            onClick={() => setStarted(true)}
          >
            Начать
          </button>
        </>
      )}
    </div>
  );
}
