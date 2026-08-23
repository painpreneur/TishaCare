"use client";

export interface QuestionOption {
  label: string;
  onClick: () => void;
}

export interface QuestionFlowProps {
  index: number;
  total: number;
  question: string;
  options: QuestionOption[];
}

export default function QuestionFlow({ index, total, question, options }: QuestionFlowProps) {
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
          <button key={i} type="button" className="miniapp-option-btn" onClick={o.onClick}>
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}
