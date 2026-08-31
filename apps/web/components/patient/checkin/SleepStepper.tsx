"use client";

// Hours slept as a big readout with − / + in 0.5 h steps, plus a range slider.
// Value is a string so an untouched field can stay empty (null on save).

const MIN = 0;
const MAX = 14;
const STEP = 0.5;

export default function SleepStepper({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const num = value === "" ? null : Number(value);
  const set = (n: number) => onChange(String(Math.max(MIN, Math.min(MAX, n))));

  return (
    <div className="sleep-stepper">
      <div className="sleep-stepper-row">
        <button
          type="button"
          className="sleep-step-btn"
          aria-label="Меньше"
          onClick={() => set((num ?? 7.5) - STEP)}
        >
          −
        </button>
        <div className="sleep-readout">
          {num == null ? "—" : Number.isInteger(num) ? num : num.toFixed(1)}
          {num != null && <span className="sleep-readout-unit">ч</span>}
        </div>
        <button
          type="button"
          className="sleep-step-btn"
          aria-label="Больше"
          onClick={() => set((num ?? 7) + STEP)}
        >
          +
        </button>
      </div>
      <input
        type="range"
        className="sleep-range"
        min={MIN}
        max={MAX}
        step={STEP}
        value={num ?? 7}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
