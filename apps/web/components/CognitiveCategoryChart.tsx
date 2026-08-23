"use client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { useIsolatedLegend } from "@/lib/useIsolatedLegend";

interface Series {
  key: string;
  label: string;
  color: string;
}

export default function CognitiveCategoryChart({
  data,
  series,
}: {
  data: Record<string, string | number>[];
  series: Series[];
}) {
  const { toggle, reset, isHidden, isFiltered } = useIsolatedLegend(series.map((s) => s.key));

  if (data.length === 0) return null;

  return (
    <div>
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#eef1f4" />
          <XAxis dataKey="date" fontSize={12} stroke="#9aa4b2" />
          <YAxis domain={[0, 100]} fontSize={12} stroke="#9aa4b2" unit="%" />
          <Tooltip />
          <Legend
            wrapperStyle={{ fontSize: 12, cursor: "pointer" }}
            onClick={(entry) => toggle(entry.dataKey as string)}
            formatter={(value, entry) => {
              const key = (entry as { dataKey?: string }).dataKey;
              const dimmed = !!key && isHidden(key);
              return <span style={{ opacity: dimmed ? 0.35 : 1 }}>{value}</span>;
            }}
          />
          {series.map((s) => (
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
          Показать все категории
        </button>
      )}
    </div>
  );
}
