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
  const [tab, setTab] = useState<"mood" | "balance" | string>("mood");

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
      })
      .catch(() => {
        if (active) setSeries([]);
      });
    return () => {
      active = false;
    };
  }, [days]);

  const q = tab === "mood" || tab === "balance" ? null : questionnaires.find((x) => x.code === tab);
  const hasBalance = (balance?.entries.length ?? 0) > 0;
  // a selected tab that is no longer available falls back to mood
  const activeTab =
    tab === "mood"
      ? "mood"
      : tab === "balance"
        ? hasBalance
          ? "balance"
          : "mood"
        : q
          ? tab
          : "mood";

  const showChips = questionnaires.length > 0 || hasBalance;

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
              onClick={() => setTab("mood")}
            >
              Настроение
            </button>
            {questionnaires.map((x) => (
              <button
                key={x.code}
                type="button"
                className={`miniapp-word-chip ${activeTab === x.code ? "active" : ""}`}
                onClick={() => setTab(x.code)}
              >
                {x.label}
              </button>
            ))}
            {hasBalance && (
              <button
                type="button"
                className={`miniapp-word-chip ${activeTab === "balance" ? "active" : ""}`}
                onClick={() => setTab("balance")}
              >
                Колесо баланса
              </button>
            )}
          </div>
        )}

        {activeTab === "mood" ? (
          <>
            <p className="hint">
              Здесь видно, как за последнее время менялись настроение, сон и энергия. Это не оценка
              и не диагноз, просто ваши отметки на графике.
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
          </>
        ) : activeTab === "balance" && balance ? (
          <BalanceCompare balance={balance} />
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
            </>
          )
        )}
      </div>
    </div>
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
