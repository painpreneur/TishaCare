"use client";

import { useEffect, useState } from "react";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Legend,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { miniAppAuthHeaders } from "@/lib/miniappClient";
import type { WellbeingPoint } from "@/lib/wellbeing";
import type { QScoreSeries } from "@/lib/questionnaireSeries";
import { entriesLabel, type Connection } from "@/lib/connections";
import type { BalanceHistory } from "@/lib/balanceHistory";
import type { WeekRhythmDay } from "@/lib/weekRhythm";
import type { YearCompare as YearCompareData } from "@/lib/yearCompare";
import type { Baseline } from "@/lib/baseline";
import WellbeingChart from "@/components/WellbeingChart";
import QuestionnaireScoreChart from "@/components/QuestionnaireScoreChart";
import BackLink from "@/components/miniapp/BackLink";

const RANGES = [7, 30, 90];

// Patient-facing view of their own trends. "Настроение" (default) is the
// check-in chart; the other tabs are the score history of any questionnaire the
// patient has completed at least once, plus — once the `balance` unlock is
// held — "Колесо баланса" (two wheels overlaid + a per-area было -> стало). No
// clinical interpretation beyond the band label the patient already saw.
export default function ProgressChart() {
  const [days, setDays] = useState(30);
  const [series, setSeries] = useState<WellbeingPoint[] | null>(null);
  const [questionnaires, setQuestionnaires] = useState<QScoreSeries[]>([]);
  const [connections, setConnections] = useState<Connection[] | null>(null);
  const [balance, setBalance] = useState<BalanceHistory | null>(null);
  const [weekRhythm, setWeekRhythm] = useState<WeekRhythmDay[] | null>(null);
  const [yearCompare, setYearCompare] = useState<YearCompareData | null>(null);
  const [unlocks, setUnlocks] = useState<string[]>([]);
  const [baseline, setBaseline] = useState<Baseline | null>(null);
  const [tab, setTab] = useState<"mood" | "balance" | string>("mood");
  // `compare` unlock: a second questionnaire scale overlaid on the score chart.
  const [overlay, setOverlay] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setSeries(null);
    fetch(`/api/miniapp/progress?days=${days}`, { headers: miniAppAuthHeaders() })
      .then((res) => res.json())
      .then((data) => {
        if (!active) return;
        setSeries(data.series ?? []);
        setQuestionnaires(data.questionnaires ?? []);
        setConnections(data.connections ?? null);
        setBalance(data.balanceHistory ?? null);
        setWeekRhythm(data.weekRhythm ?? null);
        setYearCompare(data.yearCompare ?? null);
        setUnlocks(data.unlocks ?? []);
        setBaseline(data.baseline ?? null);
      })
      .catch(() => {
        if (active) setSeries([]);
      });
    return () => {
      active = false;
    };
  }, [days]);

  const FIXED_TABS = ["mood", "balance", "baseline"];
  const q = FIXED_TABS.includes(tab) ? null : questionnaires.find((x) => x.code === tab);
  const hasBalance = (balance?.entries.length ?? 0) > 0;
  const hasBaseline = (baseline?.rows.length ?? 0) > 0;
  // a selected tab that is no longer available falls back to mood
  const activeTab =
    tab === "mood"
      ? "mood"
      : tab === "balance"
        ? hasBalance
          ? "balance"
          : "mood"
        : tab === "baseline"
          ? hasBaseline
            ? "baseline"
            : "mood"
          : q
            ? tab
            : "mood";

  const showChips = questionnaires.length > 0 || hasBalance || hasBaseline;

  function selectTab(next: string) {
    setTab(next);
    setOverlay(null);
  }

  // scales available to overlay on the current questionnaire tab
  const otherScales =
    q && unlocks.includes("compare")
      ? questionnaires.filter((x) => x.code !== q.code && x.points.length > 0)
      : [];
  const overlaySeries =
    overlay && overlay !== activeTab
      ? questionnaires.find((x) => x.code === overlay && x.points.length > 0) ?? null
      : null;

  return (
    <div>
      <BackLink />
      <div className="miniapp-card">
        <h1>Моя динамика</h1>

        {showChips && (
          <div className="miniapp-word-grid" style={{ margin: "0 0 12px" }}>
            <button
              type="button"
              className={`miniapp-word-chip ${activeTab === "mood" ? "active" : ""}`}
              onClick={() => selectTab("mood")}
            >
              Настроение
            </button>
            {questionnaires.map((x) => (
              <button
                key={x.code}
                type="button"
                className={`miniapp-word-chip ${activeTab === x.code ? "active" : ""}`}
                onClick={() => selectTab(x.code)}
              >
                {x.label}
              </button>
            ))}
            {hasBalance && (
              <button
                type="button"
                className={`miniapp-word-chip ${activeTab === "balance" ? "active" : ""}`}
                onClick={() => selectTab("balance")}
              >
                Колесо баланса
              </button>
            )}
            {hasBaseline && (
              <button
                type="button"
                className={`miniapp-word-chip ${activeTab === "baseline" ? "active" : ""}`}
                onClick={() => selectTab("baseline")}
              >
                Точка отсчёта
              </button>
            )}
          </div>
        )}

        {activeTab === "mood" ? (
          <>
            <p className="hint">
              Линия это настроение по дням, полоса вокруг неё это размах за день. Ниже: столбики
              это часы сна, точки это приём препаратов. Энергию можно добавить кнопкой. Это не
              оценка и не диагноз, просто ваши отметки.
            </p>
            <div className="miniapp-word-grid" style={{ margin: "12px 0" }}>
              {RANGES.map((r) => (
                <button
                  key={r}
                  type="button"
                  className={`miniapp-word-chip ${days === r ? "active" : ""}`}
                  onClick={() => setDays(r)}
                >
                  {r} дней
                </button>
              ))}
            </div>
            {series === null ? (
              <p className="empty">Загрузка...</p>
            ) : (
              <WellbeingChart data={series} />
            )}

            {connections && connections.length > 0 && (
              <div className="connections-block">
                <h4 className="chart-subtitle">Связи</h4>
                <ul className="correlation-list">
                  {connections.map((c) => (
                    <li key={c.label}>
                      {c.label}: {c.strength} ({entriesLabel(c.n)})
                    </li>
                  ))}
                </ul>
                <p className="hint">
                  Это связь в ваших отметках, а не причина и следствие.
                </p>
              </div>
            )}

            {weekRhythm && <WeekRhythm days={weekRhythm} />}

            {yearCompare && <YearAgo data={yearCompare} />}
          </>
        ) : activeTab === "balance" && balance ? (
          <BalanceCompare balance={balance} />
        ) : activeTab === "baseline" && baseline ? (
          <BaselineView baseline={baseline} />
        ) : (
          q && (
            <>
              <p className="hint">
                История баллов по опроснику «{q.label}». Это самонаблюдение, не оценка и не диагноз.
              </p>
              <QuestionnaireScoreChart
                data={q.points}
                domain={[0, q.max]}
                thresholds={q.thresholds}
                color={q.color}
              />
              <p className="hint" style={{ marginTop: 8 }}>
                Последний результат: {q.latest.band} ({q.latest.date}).
              </p>
              {q.points.length === 1 && (
                <p className="hint">Пройдите опросник ещё раз, чтобы увидеть динамику.</p>
              )}

              {otherScales.length > 0 && (
                <div className="connections-block">
                  <h4 className="chart-subtitle">Сравнить с другой шкалой</h4>
                  <div className="miniapp-word-grid" style={{ margin: "0 0 8px" }}>
                    <button
                      type="button"
                      className={`miniapp-word-chip ${overlay == null ? "active" : ""}`}
                      onClick={() => setOverlay(null)}
                    >
                      Без сравнения
                    </button>
                    {otherScales.map((s) => (
                      <button
                        key={s.code}
                        type="button"
                        className={`miniapp-word-chip ${overlay === s.code ? "active" : ""}`}
                        onClick={() => setOverlay(s.code)}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                  {overlaySeries ? (
                    <>
                      <ScaleCompareChart a={q} b={overlaySeries} />
                      <p className="hint">
                        Обе шкалы приведены к проценту от своего максимума, поэтому их видно рядом.
                        Это самонаблюдение, не оценка и не диагноз.
                      </p>
                    </>
                  ) : (
                    <p className="hint">
                      Выберите шкалу, чтобы наложить её на график поверх «{q.label}».
                    </p>
                  )}
                </div>
              )}
            </>
          )
        )}
      </div>
    </div>
  );
}

// `compare` unlock: two questionnaire scales on one chart. Raw scores can't
// share an axis (Beck is 0..63, GAD-7 is 0..21), so each point is shown as a
// percent of that scale's own max. Points are merged onto one time axis by
// completion timestamp; gaps are bridged (connectNulls) since the two
// questionnaires are rarely taken on the same day.
function ScaleCompareChart({ a, b }: { a: QScoreSeries; b: QScoreSeries }) {
  const map = new Map<number, { t: number; date: string; a?: number; b?: number }>();
  for (const p of a.points) {
    const row = map.get(p.t) ?? { t: p.t, date: p.date };
    row.a = Math.round((p.score / a.max) * 100);
    map.set(p.t, row);
  }
  for (const p of b.points) {
    const row = map.get(p.t) ?? { t: p.t, date: p.date };
    row.b = Math.round((p.score / b.max) * 100);
    map.set(p.t, row);
  }
  const rows = [...map.values()].sort((x, y) => x.t - y.t);

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={rows}>
        <CartesianGrid strokeDasharray="3 3" stroke="#eef1f4" />
        <XAxis dataKey="date" fontSize={12} stroke="#9aa4b2" />
        <YAxis
          domain={[0, 100]}
          ticks={[0, 50, 100]}
          fontSize={12}
          stroke="#9aa4b2"
          width={34}
          unit="%"
        />
        <Tooltip formatter={(v: number) => `${Math.round(v)}%`} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Line
          type="monotone"
          dataKey="a"
          name={a.label}
          stroke={a.color}
          strokeWidth={2}
          dot={{ r: 3 }}
          connectNulls
        />
        <Line
          type="monotone"
          dataKey="b"
          name={b.label}
          stroke={b.color}
          strokeWidth={2}
          dot={{ r: 3 }}
          connectNulls
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

// `baseline` unlock: the frozen intake battery. было -> стало per scale, with a
// numeric delta shown but deliberately not coloured — this is a reference
// point, not a score. All five of these scales run "higher = more symptoms",
// but that judgement is left to the appointment, not the chart.
function BaselineView({ baseline }: { baseline: Baseline }) {
  return (
    <>
      <p className="hint">
        Первые результаты опросников к приёму, собраны {baseline.collectedOn}. Дальше есть с чем
        сравнивать. Это самонаблюдение, не оценка и не диагноз.
      </p>
      <ul className="baseline-list">
        {baseline.rows.map((r) => (
          <li key={r.code}>
            <span className="baseline-scale">{r.label}</span>
            <span className="baseline-line">
              Было: {r.first.score} из {r.max} — {r.first.band} ({r.first.date})
            </span>
            {r.count > 1 ? (
              <span className="baseline-line">
                Сейчас: {r.latest.score} из {r.max} — {r.latest.band} ({r.latest.date})
                <em>
                  {" "}
                  {r.delta === 0
                    ? "без изменений"
                    : `${r.delta > 0 ? "+" : ""}${r.delta} к первому разу`}
                </em>
              </span>
            ) : (
              <span className="baseline-line baseline-muted">
                Пройдите опросник ещё раз, чтобы увидеть сдвиг.
              </span>
            )}
          </li>
        ))}
      </ul>
    </>
  );
}

function BalanceCompare({ balance }: { balance: BalanceHistory }) {
  const { entries, areas } = balance;
  const multi = entries.length >= 2;
  const first = entries[0];
  const latest = entries[entries.length - 1];

  const radarData = areas.map((a) => ({ area: a.label, first: a.first, latest: a.latest }));
  const avgData = entries.map((e) => ({ date: e.date, avg: e.average }));

  return (
    <>
      <p className="hint">
        {multi
          ? `Колесо от ${first.date} и от ${latest.date}, наложены друг на друга.`
          : "Ваше колесо баланса. Пройдите его ещё раз, чтобы сравнить."}
      </p>

      <ResponsiveContainer width="100%" height={260}>
        <RadarChart data={radarData} outerRadius="72%">
          <PolarGrid />
          <PolarAngleAxis dataKey="area" fontSize={11} />
          <PolarRadiusAxis domain={[0, 10]} tick={false} axisLine={false} />
          {multi && (
            <Radar name={first.date} dataKey="first" stroke="#c3c9d4" fill="#c3c9d4" fillOpacity={0.15} />
          )}
          <Radar
            name={multi ? latest.date : "Сейчас"}
            dataKey="latest"
            stroke="#4f6bfe"
            fill="#4f6bfe"
            fillOpacity={0.28}
          />
          {multi && <Legend wrapperStyle={{ fontSize: 12 }} />}
        </RadarChart>
      </ResponsiveContainer>

      {multi && (
        <ul className="balance-delta-list">
          {areas.map((a) => (
            <li key={a.label}>
              <span>{a.label}</span>
              <span>
                {a.first} &rarr; {a.latest}
                {a.delta !== 0 && (
                  <em className={a.delta > 0 ? "up" : "down"}>
                    {" "}
                    ({a.delta > 0 ? "+" : ""}
                    {a.delta})
                  </em>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}

      {multi && (
        <>
          <h4 className="chart-subtitle" style={{ marginTop: 16 }}>
            Среднее по колесу
          </h4>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={avgData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef1f4" />
              <XAxis dataKey="date" fontSize={12} stroke="#9aa4b2" />
              <YAxis domain={[0, 10]} fontSize={12} stroke="#9aa4b2" />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="avg"
                name="Среднее"
                stroke="#4f6bfe"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </>
      )}
    </>
  );
}

function WeekRhythm({ days }: { days: WeekRhythmDay[] }) {
  const withData = days.filter((d) => d.moodRaw != null);
  const lowest = withData.reduce<WeekRhythmDay | null>(
    (m, d) => (m == null || (d.moodRaw ?? 0) < (m.moodRaw ?? 0) ? d : m),
    null,
  );
  const highest = withData.reduce<WeekRhythmDay | null>(
    (m, d) => (m == null || (d.moodRaw ?? 0) > (m.moodRaw ?? 0) ? d : m),
    null,
  );
  const spread =
    lowest && highest && lowest !== highest ? (highest.moodRaw ?? 0) - (lowest.moodRaw ?? 0) : 0;

  const data = days.map((d) => ({ label: d.label, moodPct: d.moodPct, n: d.n }));

  return (
    <div className="connections-block">
      <h4 className="chart-subtitle">Ритм недели</h4>
      <ResponsiveContainer width="100%" height={160}>
        <BarChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#eef1f4" vertical={false} />
          <XAxis dataKey="label" fontSize={12} stroke="#9aa4b2" />
          <YAxis domain={[0, 100]} ticks={[0, 50, 100]} fontSize={12} stroke="#9aa4b2" width={34} unit="%" />
          <Tooltip formatter={(v: number) => `${Math.round(v)}%`} />
          <Bar dataKey="moodPct" name="Настроение" fill="#4f6bfe" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
      <p className="hint">
        {spread >= 0.4 && lowest && highest
          ? `Тяжелее всего по ${dayGenitive(lowest.label)}, легче по ${dayGenitive(highest.label)}.`
          : "Пока состояние по дням недели ровное."}
      </p>
    </div>
  );
}

const DAY_GEN: Record<string, string> = {
  Пн: "понедельникам",
  Вт: "вторникам",
  Ср: "средам",
  Чт: "четвергам",
  Пт: "пятницам",
  Сб: "субботам",
  Вс: "воскресеньям",
};
const dayGenitive = (label: string) => DAY_GEN[label] ?? label;

const MOOD_WORDS = ["Очень плохо", "Плохо", "Нормально", "Хорошо", "Отлично"];
function moodWord(n: number | null): string {
  if (n == null) return "—";
  const i = Math.round(n) + 2;
  return MOOD_WORDS[Math.min(4, Math.max(0, i))] ?? n.toFixed(1);
}

function YearAgo({ data }: { data: YearCompareData }) {
  const { nowAvg, nowN, thenAvg, thenN } = data;

  let verdict = "";
  if (nowAvg != null && thenAvg != null) {
    const d = nowAvg - thenAvg;
    verdict =
      Math.abs(d) < 0.4
        ? "Примерно как год назад."
        : d > 0
          ? "Сейчас настроение выше, чем год назад."
          : "Сейчас настроение ниже, чем год назад.";
  }

  return (
    <div className="connections-block">
      <h4 className="chart-subtitle">Год назад</h4>
      <ul className="correlation-list">
        <li>
          Последние две недели: {moodWord(nowAvg)}
          {nowN > 0 && ` (по ${nowN} записям)`}
        </li>
        <li>
          Те же дни год назад:{" "}
          {thenAvg != null ? `${moodWord(thenAvg)} (по ${thenN} записям)` : "записей не было"}
        </li>
      </ul>
      {verdict && <p className="hint">{verdict}</p>}
    </div>
  );
}
