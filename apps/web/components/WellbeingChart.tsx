"use client";

import {
  ComposedChart,
  Line,
  Scatter,
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
import type { WellbeingPoint } from "@/lib/wellbeing";
import { stateTagLabels, ACTIVATION_TAG_IDS, MEDS_LABEL, type MedsStatus } from "@/lib/checkin";

export type { WellbeingPoint };

const MOOD_LABEL: Record<number, string> = {
  [-2]: "Очень плохо",
  [-1]: "Плохо",
  [0]: "Нормально",
  [1]: "Хорошо",
  [2]: "Отлично",
};
const roundMood = (n: number) => MOOD_LABEL[Math.round(n) as -2 | -1 | 0 | 1 | 2] ?? n.toFixed(1);

const SERIES: { key: keyof WellbeingPoint; label: string; color: string }[] = [
  { key: "moodPct", label: "Настроение", color: "#4f6bfe" },
  { key: "energyPct", label: "Энергия", color: "#f2a93b" },
  { key: "sleepPct", label: "Сон", color: "#a35fe0" },
  { key: "medsPct", label: "Приём препаратов", color: "#22b8b0" },
];

function WellbeingTooltip({ active, payload }: TooltipProps<number, string>) {
  if (!active || !payload || payload.length === 0) return null;
  const point = payload.map((p) => p.payload as WellbeingPoint).find((p) => p && p.entries);
  if (!point) return null;

  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #eef1f4",
        borderRadius: 8,
        padding: "8px 12px",
        fontSize: 12,
        boxShadow: "0 4px 12px rgba(20, 30, 50, 0.08)",
        maxWidth: 240,
      }}
    >
      <div style={{ fontWeight: 600, marginBottom: 4 }}>{point.date}</div>
      {point.entries.map((e, i) => (
        <div key={i} style={{ marginBottom: 3 }}>
          <span style={{ color: "#9aa4b2" }}>{e.time}</span> · {roundMood(e.moodRaw)}
          {e.tags.length > 0 && <span> · {stateTagLabels(e.tags).join(", ")}</span>}
          {e.note && <div style={{ color: "#6b7684" }}>«{e.note}»</div>}
        </div>
      ))}
      <div style={{ borderTop: "1px solid #eef1f4", marginTop: 4, paddingTop: 4, color: "#6b7684" }}>
        Среднее за день: {roundMood(point.moodRaw)}
        {point.energyRaw != null && <> · энергия {point.energyRaw}/5</>}
        {point.sleepRaw != null && <> · сон {point.sleepRaw.toFixed(1)} ч</>}
        {point.medsRaw != null && <> · препараты {MEDS_LABEL[point.medsRaw as MedsStatus] ?? point.medsRaw}</>}
      </div>
    </div>
  );
}

function EntryDot(props: { cx?: number; cy?: number; payload?: { activated?: boolean } }) {
  const { cx, cy, payload } = props;
  if (cx == null || cy == null) return null;
  const activated = payload?.activated;
  return (
    <circle
      cx={cx}
      cy={cy}
      r={activated ? 5 : 3}
      fill={activated ? "#fff" : "#4f6bfe"}
      stroke="#4f6bfe"
      strokeWidth={activated ? 2 : 1}
      opacity={0.75}
    />
  );
}

export default function WellbeingChart({ data }: { data: WellbeingPoint[] }) {
  const { toggle, reset, isHidden, isFiltered } = useIsolatedLegend(SERIES.map((s) => s.key as string));

  if (data.length === 0) {
    return <p className="empty">Пока нет данных чек-инов.</p>;
  }

  const tickByT = new Map(data.map((p) => [p.t, p.date]));
  const entryPoints = data.flatMap((p) =>
    p.entries.map((e) => ({
      t: e.t,
      entryMoodPct: e.moodPct,
      activated: e.tags.some((tag) => ACTIVATION_TAG_IDS.includes(tag)),
    }))
  );
  const showEntryDots = !isHidden("moodPct") && entryPoints.length > data.length;

  return (
    <div>
      <ResponsiveContainer width="100%" height={260}>
        <ComposedChart data={data} margin={{ top: 5, right: 10, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#eef1f4" />
          <XAxis
            type="number"
            dataKey="t"
            domain={["dataMin", "dataMax"]}
            ticks={data.map((p) => p.t)}
            tickFormatter={(t) => tickByT.get(t) ?? ""}
            allowDuplicatedCategory={false}
            fontSize={12}
            stroke="#9aa4b2"
          />
          <YAxis domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} fontSize={12} stroke="#9aa4b2" unit="%" />
          <Tooltip content={<WellbeingTooltip />} />
          <ReferenceLine
            y={50}
            stroke="#d8dee6"
            strokeDasharray="4 4"
            label={{ value: "нейтральное настроение", position: "insideTopRight", fontSize: 11, fill: "#9aa4b2" }}
          />
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
              isAnimationActive={false}
              hide={isHidden(s.key)}
            />
          ))}
          {showEntryDots && (
            <Scatter data={entryPoints} dataKey="entryMoodPct" legendType="none" shape={<EntryDot />} />
          )}
        </ComposedChart>
      </ResponsiveContainer>
      {isFiltered && (
        <button type="button" className="link-btn" onClick={reset}>
          Показать все показатели
        </button>
      )}
    </div>
  );
}
