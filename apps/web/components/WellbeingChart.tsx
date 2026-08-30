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

// One row per mark on the numeric time axis: a daily row (carries the smooth-
// line values) and, for days with more than one check-in, a row per entry
// (carries `entryMoodPct` for the scatter dot). Every row keeps a reference to
// its `day`, so the tooltip has the full picture whichever mark the pointer
// lands on.
type Row = {
  t: number;
  day: WellbeingPoint;
  moodPct?: number;
  energyPct?: number | null;
  sleepPct?: number | null;
  medsPct?: number | null;
  entryMoodPct?: number;
  activated?: boolean;
};

function buildRows(data: WellbeingPoint[]): Row[] {
  const rows: Row[] = data.map((p) => ({
    t: p.t,
    day: p,
    moodPct: p.moodPct,
    energyPct: p.energyPct,
    sleepPct: p.sleepPct,
    medsPct: p.medsPct,
  }));
  for (const p of data) {
    if (p.entries.length < 2) continue;
    for (const e of p.entries) {
      rows.push({
        t: e.t,
        day: p,
        entryMoodPct: e.moodPct,
        activated: e.tags.some((tag) => ACTIVATION_TAG_IDS.includes(tag)),
      });
    }
  }
  return rows.sort((a, b) => a.t - b.t);
}

function WellbeingTooltip({ active, payload }: TooltipProps<number, string>) {
  if (!active || !payload || payload.length === 0) return null;
  const day = (payload[0]?.payload as Row | undefined)?.day;
  if (!day) return null;

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
      <div style={{ fontWeight: 600, marginBottom: 4 }}>{day.date}</div>
      {day.entries.map((e, i) => (
        <div key={i} style={{ marginBottom: 3 }}>
          <span style={{ color: "#9aa4b2" }}>{e.time}</span> · {roundMood(e.moodRaw)}
          {e.tags.length > 0 && <span> · {stateTagLabels(e.tags).join(", ")}</span>}
          {e.note && <div style={{ color: "#6b7684" }}>«{e.note}»</div>}
        </div>
      ))}
      {day.entries.length > 1 && (
        <div style={{ borderTop: "1px solid #eef1f4", marginTop: 4, paddingTop: 4, color: "#6b7684" }}>
          Среднее за день: {roundMood(day.moodRaw)}
        </div>
      )}
      {(day.energyRaw != null || day.sleepRaw != null || day.medsRaw != null) && (
        <div style={{ borderTop: "1px solid #eef1f4", marginTop: 4, paddingTop: 4, color: "#6b7684" }}>
          {day.energyRaw != null && <>энергия {day.energyRaw}/5</>}
          {day.sleepRaw != null && <>{day.energyRaw != null ? " · " : ""}сон {day.sleepRaw.toFixed(1)} ч</>}
          {day.medsRaw != null && (
            <>
              {day.energyRaw != null || day.sleepRaw != null ? " · " : ""}
              препараты {MEDS_LABEL[day.medsRaw as MedsStatus] ?? day.medsRaw}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function EntryDot(props: { cx?: number; cy?: number; payload?: Row }) {
  const { cx, cy, payload } = props;
  if (cx == null || cy == null || payload?.entryMoodPct == null) return null;
  const activated = payload?.activated;
  return (
    <circle
      cx={cx}
      cy={cy}
      r={activated ? 5 : 3}
      fill={activated ? "#fff" : "#4f6bfe"}
      stroke="#4f6bfe"
      strokeWidth={activated ? 2 : 1}
      opacity={0.8}
    />
  );
}

export default function WellbeingChart({
  data,
  initialHidden = [],
}: {
  data: WellbeingPoint[];
  /** Series keys to start hidden (still revealable from the legend). */
  initialHidden?: string[];
}) {
  const { toggle, reset, isHidden, isFiltered } = useIsolatedLegend(
    SERIES.map((s) => s.key as string),
    initialHidden,
  );

  if (data.length === 0) {
    return <p className="empty">Пока нет данных чек-инов.</p>;
  }

  const rows = buildRows(data);
  const tickByT = new Map(data.map((p) => [p.t, p.date]));
  // Recharts' auto ticks on a numeric axis land between real days, where the
  // formatter has no label — so pick an evenly thinned subset of actual days.
  const step = Math.max(1, Math.ceil(data.length / 6));
  const xTicks = data.filter((_, i) => i % step === 0 || i === data.length - 1).map((p) => p.t);
  const showEntryDots = !isHidden("moodPct") && rows.some((r) => r.entryMoodPct != null);

  return (
    <div>
      <ResponsiveContainer width="100%" height={260}>
        <ComposedChart data={rows} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#eef1f4" />
          <XAxis
            type="number"
            dataKey="t"
            domain={["dataMin", "dataMax"]}
            ticks={xTicks}
            tickFormatter={(t) => tickByT.get(Math.round(t)) ?? ""}
            fontSize={12}
            stroke="#9aa4b2"
          />
          <YAxis
            domain={[0, 100]}
            ticks={[0, 25, 50, 75, 100]}
            fontSize={12}
            stroke="#9aa4b2"
            width={40}
            unit="%"
          />
          <Tooltip content={<WellbeingTooltip />} />
          <ReferenceLine y={50} stroke="#d8dee6" strokeDasharray="4 4" />
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
              dot={{ r: 2.5 }}
              activeDot={{ r: 4 }}
              connectNulls
              isAnimationActive={false}
              hide={isHidden(s.key)}
            />
          ))}
          {showEntryDots && (
            <Scatter dataKey="entryMoodPct" legendType="none" shape={<EntryDot />} isAnimationActive={false} />
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
