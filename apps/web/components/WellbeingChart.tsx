"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
  TooltipProps,
} from "recharts";
import { useIsolatedLegend } from "@/lib/useIsolatedLegend";

export interface WellbeingPoint {
  date: string;
  moodRaw: number;
  moodPct: number;
  energyRaw: number | null;
  energyPct: number | null;
  sleepRaw: number | null;
  sleepPct: number | null;
  medsRaw: boolean | null;
  medsPct: number | null;
}

const MOOD_LABEL: Record<number, string> = {
  [-2]: "Очень плохо",
  [-1]: "Плохо",
  [0]: "Нормально",
  [1]: "Хорошо",
  [2]: "Отлично",
};

const SERIES: { key: keyof WellbeingPoint; label: string; color: string }[] = [
  { key: "moodPct", label: "Настроение", color: "#4f6bfe" },
  { key: "energyPct", label: "Энергия", color: "#f2a93b" },
  { key: "sleepPct", label: "Сон", color: "#a35fe0" },
  { key: "medsPct", label: "Приём препаратов", color: "#22b8b0" },
];

function WellbeingTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload || payload.length === 0) return null;
  const point = payload[0].payload as WellbeingPoint;

  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #eef1f4",
        borderRadius: 8,
        padding: "8px 12px",
        fontSize: 12,
        boxShadow: "0 4px 12px rgba(20, 30, 50, 0.08)",
      }}
    >
      <div style={{ fontWeight: 600, marginBottom: 4 }}>{label}</div>
      <div>Настроение: {MOOD_LABEL[point.moodRaw] ?? point.moodRaw}</div>
      {point.energyRaw != null && <div>Энергия: {point.energyRaw}/5</div>}
      {point.sleepRaw != null && <div>Сон: {point.sleepRaw.toFixed(1)} ч</div>}
      {point.medsRaw != null && <div>Препараты: {point.medsRaw ? "принял(а)" : "не принял(а)"}</div>}
    </div>
  );
}

export default function WellbeingChart({ data }: { data: WellbeingPoint[] }) {
  const { toggle, reset, isHidden, isFiltered } = useIsolatedLegend(SERIES.map((s) => s.key as string));

  if (data.length === 0) {
    return <p className="empty">Пока нет данных чек-инов.</p>;
  }

  return (
    <div>
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#eef1f4" />
          <XAxis dataKey="date" fontSize={12} stroke="#9aa4b2" />
          <YAxis domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} fontSize={12} stroke="#9aa4b2" unit="%" />
          <Tooltip content={<WellbeingTooltip />} />
          <ReferenceLine y={50} stroke="#d8dee6" strokeDasharray="4 4" label={{ value: "нейтральное настроение", position: "insideTopRight", fontSize: 11, fill: "#9aa4b2" }} />
          <Legend
            wrapperStyle={{ fontSize: 12, cursor: "pointer" }}
            onClick={(entry) => toggle(entry.dataKey as string)}
            formatter={(value, entry) => {
              const key = (entry as { dataKey?: string }).dataKey;
              const dimmed = !!key && isHidden(key);
              return <span style={{ opacity: dimmed ? 0.35 : 1 }}>{value}</span>;
            }}
          />
          {SERIES.map((s) => (
            <Line
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.label}
              stroke={s.color}
              strokeWidth={2}
              dot={{ r: 3 }}
              connectNulls
              hide={isHidden(s.key)}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
      {isFiltered && (
        <button type="button" className="link-btn" onClick={reset}>
          Показать все показатели
        </button>
      )}
    </div>
  );
}
