"use client";

import { useEffect, useState } from "react";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from "recharts";
import {
  LIFE_AREAS,
  BALANCE_WHEEL_CODE,
  BALANCE_WHEEL_DISCLAIMER,
  interpretBalanceWheel,
} from "@tishacare/db/client";
import { miniAppAuthHeaders } from "@/lib/miniappClient";
import BackLink from "@/components/miniapp/BackLink";

export default function LifeBalanceWheel() {
  const [values, setValues] = useState<number[]>(LIFE_AREAS.map(() => 5));
  // The last saved wheel: pre-fills the sliders and shows as a faint layer, so
  // opening the wheel again starts from where the patient was, not a flat 5.
  const [prev, setPrev] = useState<number[] | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    fetch("/api/miniapp/balance", { headers: miniAppAuthHeaders() })
      .then((r) => r.json())
      .then((d) => {
        if (!active || !d.last?.values) return;
        setValues(d.last.values);
        setPrev(d.last.values);
      })
      .catch(() => {
        /* first wheel — keep the flat 5 */
      });
    return () => {
      active = false;
    };
  }, []);

  const data = LIFE_AREAS.map((a, i) => ({
    area: a.label,
    value: values[i],
    prev: prev?.[i] ?? null,
  }));

  async function save() {
    setSaving(true);
    await fetch("/api/miniapp/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...miniAppAuthHeaders() },
      body: JSON.stringify({ testCode: BALANCE_WHEEL_CODE, results: values }),
    });
    setSaving(false);
    setSaved(true);
    setPrev([...values]); // the "before" layer now reflects what was just saved
  }

  const result = interpretBalanceWheel(values);

  return (
    <div>
      <BackLink />
      <div className="miniapp-card">
        <h1>Колесо баланса</h1>
        <p className="hint">
          Оцените от 1 до 10, насколько вы довольны каждой сферой жизни прямо сейчас.
        </p>
        {prev && (
          <p className="hint" style={{ marginTop: 4 }}>
            Бледным показан прошлый раз, ползунки начинаются с тех же значений.
          </p>
        )}

        <ResponsiveContainer width="100%" height={260}>
          <RadarChart data={data} outerRadius="75%">
            <PolarGrid />
            <PolarAngleAxis dataKey="area" fontSize={11} />
            <PolarRadiusAxis domain={[0, 10]} tick={false} axisLine={false} />
            {prev && (
              <Radar dataKey="prev" stroke="#c3c9d4" fill="#c3c9d4" fillOpacity={0.12} />
            )}
            <Radar dataKey="value" stroke="#4f6bfe" fill="#4f6bfe" fillOpacity={0.25} />
          </RadarChart>
        </ResponsiveContainer>

        {LIFE_AREAS.map((a, i) => (
          <div className="field" key={a.id}>
            <label>
              {a.label}: <strong>{values[i]}</strong>
              {prev && prev[i] !== values[i] && (
                <span className="hint" style={{ marginLeft: 8 }}>было {prev[i]}</span>
              )}
            </label>
            <input
              type="range"
              min={1}
              max={10}
              value={values[i]}
              onChange={(e) => {
                const next = [...values];
                next[i] = Number(e.target.value);
                setValues(next);
                setSaved(false);
              }}
            />
          </div>
        ))}

        <p className="hint">{result.note}</p>

        <button className="btn-primary btn-inline" onClick={save} disabled={saving}>
          {saving ? "Сохраняем..." : saved ? "Сохранено ✓" : "Сохранить"}
        </button>

        <p className="hint" style={{ marginTop: 12 }}>{BALANCE_WHEEL_DISCLAIMER}</p>
      </div>
    </div>
  );
}
