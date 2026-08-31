"use client";

// Energy 1..5 as a tap-to-fill meter. Tapping the current level clears it
// (energy is optional). Colour shifts from a calm low to a lively high.

const COLORS = ["#8fb3f5", "#7fc2d9", "#67c9a6", "#63c07a", "#5bb85f"];

export default function EnergyMeter({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
}) {
  return (
    <div className="energy-meter" role="group" aria-label="Уровень энергии">
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = value != null && n <= value;
        return (
          <button
            key={n}
            type="button"
            className={`energy-seg ${filled ? "filled" : ""}`}
            aria-pressed={filled}
            aria-label={`${n} из 5`}
            style={filled ? { background: COLORS[n - 1] } : undefined}
            onClick={() => onChange(value === n ? null : n)}
          >
            <span className="energy-seg-num">{n}</span>
          </button>
        );
      })}
    </div>
  );
}
