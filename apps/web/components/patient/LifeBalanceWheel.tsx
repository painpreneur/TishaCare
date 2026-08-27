"use client";

import { useState } from "react";
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
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const data = LIFE_AREAS.map((a, i) => ({ area: a.label, value: values[i] }));

  async function save() {
    setSaving(true);
    await fetch("/api/miniapp/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...miniAppAuthHeaders() },
      body: JSON.stringify({ testCode: BALANCE_WHEEL_CODE, results: values }),
    });
    setSaving(false);
    setSaved(true);
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

        <ResponsiveContainer width="100%" height={260}>
          <RadarChart data={data} outerRadius="75%">
            <PolarGrid />
            <PolarAngleAxis dataKey="area" fontSize={11} />
            <PolarRadiusAxis domain={[0, 10]} tick={false} axisLine={false} />
            <Radar dataKey="value" stroke="#4f6bfe" fill="#4f6bfe" fillOpacity={0.25} />
          </RadarChart>
        </ResponsiveContainer>

        {LIFE_AREAS.map((a, i) => (
          <div className="field" key={a.id}>
            <label>
              {a.label}: <strong>{values[i]}</strong>
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
