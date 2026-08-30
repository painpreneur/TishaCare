"use client";

import { useEffect, useState } from "react";
import {
  ComposedChart,
  Line,
  Area,
  Bar,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceArea,
  ResponsiveContainer,
  TooltipProps,
} from "recharts";
import { aggregateWeekly, type WellbeingPoint } from "@/lib/wellbeing";
import { MEDS_LABEL, type MedsStatus } from "@/lib/checkin";

export type { WellbeingPoint };

const MOOD_LABEL: Record<number, string> = {
  [-2]: "Очень плохо",
  [-1]: "Плохо",
  [0]: "Нормально",
  [1]: "Хорошо",
  [2]: "Отлично",
};
const moodWord = (n: number) => MOOD_LABEL[Math.round(n)] ?? n.toFixed(1);

// «1 отметка», «3 отметки», «7 отметок»
function pluralMark(n: number): string {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return "отметка";
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return "отметки";
  return "отметок";
}
// Y axis: full words only at the three anchor points, blanks keep the gridlines.
const AXIS_WORD: Record<number, string> = { [-2]: "Плохо", [0]: "Норма", [2]: "Отлично" };

const MOOD_COLOR = "#4f6bfe";
const ENERGY_COLOR = "#f2a93b";
const SLEEP_COLOR = "#a35fe0";
const MEDS_STRIP_Y = 10.6; // meds dots ride near the top of the 0…12 sleep strip

type Row = {
  t: number;
  date: string;
  mood: number;
  moodMin: number;
  moodMax: number;
  /** [min, max] band around the mean — the day's (or week's) spread */
  moodRange: [number, number];
  swing: boolean;
  energy: number | null;
  sleep: number | null;
  meds: number | null;
  medsY: number | null;
  count: number;
};

function toRows(points: WellbeingPoint[]): Row[] {
  return points.map((p) => ({
    t: p.t,
    date: p.date,
    mood: p.moodRaw,
    moodMin: p.moodMin,
    moodMax: p.moodMax,
    moodRange: [p.moodMin, p.moodMax],
    swing: Math.round(p.moodMin) !== Math.round(p.moodMax),
    energy: p.energyRaw,
    sleep: p.sleepRaw,
    meds: p.medsAdherence,
    medsY: p.medsAdherence == null ? null : MEDS_STRIP_Y,
    count: p.count,
  }));
}

function medsColor(a: number): { fill: string; stroke: string } {
  if (a >= 0.75) return { fill: "#22b8b0", stroke: "#22b8b0" }; // принял
  if (a >= 0.25) return { fill: "#f2a93b", stroke: "#f2a93b" }; // частично
  return { fill: "#fff", stroke: "#c3c9d4" }; // пропуск
}

function MedsDot(props: { cx?: number; cy?: number; payload?: Row }) {
  const { cx, cy, payload } = props;
  if (cx == null || cy == null || payload?.meds == null) return null;
  const c = medsColor(payload.meds);
  return <circle cx={cx} cy={cy} r={3.5} fill={c.fill} stroke={c.stroke} strokeWidth={1.5} />;
}

function WellbeingTooltip({
  active,
  payload,
  weekly,
}: TooltipProps<number, string> & { weekly: boolean }) {
  if (!active || !payload || payload.length === 0) return null;
  const r = payload[0]?.payload as Row | undefined;
  if (!r) return null;

  const swingText = r.swing ? ` (${moodWord(r.moodMin)} → ${moodWord(r.moodMax)})` : "";
  const extras: string[] = [];
  if (r.energy != null) extras.push(`энергия ${Math.round(r.energy * 10) / 10}/5`);
  if (r.sleep != null) extras.push(`сон ${r.sleep.toFixed(1)} ч`);
  if (r.meds != null) {
    const key: MedsStatus = r.meds >= 0.75 ? "yes" : r.meds >= 0.25 ? "partial" : "no";
    extras.push(`приём ${MEDS_LABEL[key]}`);
  }

  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #eef1f4",
        borderRadius: 8,
        padding: "7px 10px",
        fontSize: 12,
        lineHeight: 1.4,
        boxShadow: "0 4px 12px rgba(20, 30, 50, 0.1)",
        maxWidth: 220,
      }}
    >
      <div style={{ fontWeight: 600 }}>{r.date}</div>
      <div>
        Настроение: {moodWord(r.mood)}
        <span style={{ color: "#9aa4b2" }}>{swingText}</span>
      </div>
      {r.count > 1 && (
        <div style={{ color: "#9aa4b2" }}>
          {r.count} {pluralMark(r.count)} за {weekly ? "неделю" : "день"}
        </div>
      )}
      {extras.length > 0 && <div style={{ color: "#6b7684" }}>{extras.join(" · ")}</div>}
    </div>
  );
}

export default function WellbeingChart({ data }: { data: WellbeingPoint[] }) {
  const [showEnergy, setShowEnergy] = useState(false);
  const [narrow, setNarrow] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 480px)");
    const sync = () => setNarrow(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  if (data.length === 0) {
    return <p className="empty">Пока нет данных чек-инов.</p>;
  }

  const weekly = data.length > 45;
  const points = weekly ? aggregateWeekly(data) : data;
  const rows = toRows(points);

  const tickByT = new Map(points.map((p) => [p.t, p.date]));
  const step = Math.max(1, Math.ceil(points.length / 6));
  const xTicks = points
    .filter((_, i) => i % step === 0 || i === points.length - 1)
    .map((p) => p.t);
  const xDomain: [number, number] = [points[0].t, points[points.length - 1].t];
  const hasSleep = rows.some((r) => r.sleep != null);
  const hasMeds = rows.some((r) => r.meds != null);

  const AXIS_W = 62;
  const margin = { top: 6, right: 12, bottom: 0, left: 0 };

  return (
    <div className="wb-chart">
      <ResponsiveContainer width="100%" height={196}>
        <ComposedChart data={rows} margin={margin}>
          <ReferenceArea yAxisId="mood" y1={0} y2={2} fill="#e7f4ec" fillOpacity={0.6} />
          <CartesianGrid strokeDasharray="3 3" stroke="#eef1f4" vertical={false} />
          <XAxis
            type="number"
            dataKey="t"
            domain={xDomain}
            ticks={xTicks}
            tickFormatter={(t) => tickByT.get(Math.round(t)) ?? ""}
            fontSize={11}
            stroke="#9aa4b2"
          />
          <YAxis
            yAxisId="mood"
            domain={[-2, 2]}
            ticks={[-2, -1, 0, 1, 2]}
            tickFormatter={(v) => AXIS_WORD[v] ?? ""}
            width={AXIS_W}
            fontSize={11}
            stroke="#9aa4b2"
          />
          {showEnergy && <YAxis yAxisId="energy" domain={[1, 5]} hide />}
          <Tooltip
            content={<WellbeingTooltip weekly={weekly} />}
            position={narrow ? { x: 8, y: 8 } : undefined}
            allowEscapeViewBox={{ x: false, y: false }}
            wrapperStyle={{ zIndex: 10 }}
          />
          {showEnergy && (
            <Line
              yAxisId="energy"
              type="monotone"
              dataKey="energy"
              stroke={ENERGY_COLOR}
              strokeWidth={1.5}
              strokeOpacity={0.7}
              dot={false}
              connectNulls
              isAnimationActive={false}
            />
          )}
          <Area
            yAxisId="mood"
            type="monotone"
            dataKey="moodRange"
            stroke="none"
            fill={MOOD_COLOR}
            fillOpacity={0.12}
            connectNulls
            isAnimationActive={false}
            activeDot={false}
          />
          <Line
            yAxisId="mood"
            type="monotone"
            dataKey="mood"
            stroke={MOOD_COLOR}
            strokeWidth={2}
            dot={{ r: 2.5 }}
            activeDot={{ r: 5 }}
            connectNulls
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>

      {(hasSleep || hasMeds) && (
        <ResponsiveContainer width="100%" height={52}>
          <ComposedChart data={rows} margin={{ ...margin, top: 2 }}>
            <XAxis
              type="number"
              dataKey="t"
              domain={xDomain}
              ticks={xTicks}
              tick={false}
              axisLine={false}
              height={1}
            />
            <YAxis
              yAxisId="strip"
              domain={[0, 12]}
              width={AXIS_W}
              tick={false}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              content={<WellbeingTooltip weekly={weekly} />}
              position={narrow ? { x: 8, y: 8 } : undefined}
              allowEscapeViewBox={{ x: false, y: false }}
              wrapperStyle={{ zIndex: 10 }}
            />
            {hasSleep && (
              <Bar
                yAxisId="strip"
                dataKey="sleep"
                fill={SLEEP_COLOR}
                fillOpacity={0.22}
                radius={[2, 2, 0, 0]}
                isAnimationActive={false}
              />
            )}
            {hasMeds && (
              <Scatter yAxisId="strip" dataKey="medsY" shape={<MedsDot />} isAnimationActive={false} />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      )}

      <div className="wb-legend">
        <span>
          <i className="wb-swatch" style={{ background: MOOD_COLOR }} /> Настроение
        </span>
        {hasSleep && (
          <span>
            <i className="wb-swatch" style={{ background: SLEEP_COLOR, opacity: 0.35 }} /> сон, часы
          </span>
        )}
        {hasMeds && (
          <span>
            <i className="wb-dot" style={{ background: "#22b8b0" }} /> приём
            <i className="wb-dot" style={{ background: "#f2a93b" }} /> частично
            <i className="wb-dot wb-dot--empty" /> пропуск
          </span>
        )}
        <button
          type="button"
          className={`wb-toggle ${showEnergy ? "on" : ""}`}
          onClick={() => setShowEnergy((v) => !v)}
        >
          {showEnergy ? "Скрыть энергию" : "Показать энергию"}
        </button>
      </div>

      {weekly && (
        <p className="hint">Длинный период показан по неделям: линия — среднее, полоса — размах.</p>
      )}
    </div>
  );
}
