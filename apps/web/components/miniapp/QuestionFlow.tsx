"use client";

import type { ReactNode } from "react";

export interface QuestionOption {
  label: string;
  onClick: () => void;
}

export interface QuestionFlowProps {
  index: number;
  total: number;
  question: string;
  options: QuestionOption[];
  /** Optional note under the options, inside the same card. */
  footer?: ReactNode;
}

export default function QuestionFlow({ index, total, question, options, footer }: QuestionFlowProps) {
  return (
    <div className="miniapp-card">
      <div className="miniapp-progress">
        <div className="miniapp-progress-bar" style={{ width: `${(index / total) * 100}%` }} />
      </div>
      <p className="hint">
        Вопрос {index + 1} из {total}
      </p>
      <h2>{question}</h2>
      <div className="miniapp-question-options">
        {options.map((o, i) => (
          <button
            // Key by question index too, so the option button remounts each
            // question and the browser focus ring does not linger on the same
            // position and look like a carried-over answer.
            key={`${index}-${i}`}
            type="button"
            className="miniapp-option-btn"
            onClick={o.onClick}
          >
            {o.label}
          </button>
        ))}
      </div>
      {footer && <div style={{ marginTop: 12 }}>{footer}</div>}
    </div>
  );
}
