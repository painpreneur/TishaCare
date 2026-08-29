"use client";

import { useEffect, useState } from "react";
import { miniAppAuthHeaders } from "@/lib/miniappClient";
import type { WellbeingPoint } from "@/lib/wellbeing";
import type { QScoreSeries } from "@/lib/questionnaireSeries";
import { entriesLabel, type Connection } from "@/lib/connections";
import WellbeingChart from "@/components/WellbeingChart";
import QuestionnaireScoreChart from "@/components/QuestionnaireScoreChart";
import BackLink from "@/components/miniapp/BackLink";

const RANGES = [7, 30, 90];

// Patient-facing view of their own trends. "Настроение" (default) is the
// check-in chart; the other tabs are the score history of any questionnaire the
// patient has completed at least once. No clinical interpretation beyond the
// band label the patient already saw on the result screen.
export default function ProgressChart() {
  const [days, setDays] = useState(30);
  const [series, setSeries] = useState<WellbeingPoint[] | null>(null);
  const [questionnaires, setQuestionnaires] = useState<QScoreSeries[]>([]);
  const [connections, setConnections] = useState<Connection[] | null>(null);
  const [tab, setTab] = useState<"mood" | string>("mood");

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
      })
      .catch(() => {
        if (active) setSeries([]);
      });
    return () => {
      active = false;
    };
  }, [days]);

  const q = tab === "mood" ? null : questionnaires.find((x) => x.code === tab);
  // a selected questionnaire tab that is no longer present falls back to mood
  const activeTab = tab !== "mood" && !q ? "mood" : tab;

  return (
    <div>
      <BackLink />
      <div className="miniapp-card">
        <h1>Моя динамика</h1>

        {questionnaires.length > 0 && (
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
