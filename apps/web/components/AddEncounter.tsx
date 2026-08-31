"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ENCOUNTER_FIELDS,
  ENCOUNTER_FIELD_LABEL,
  ENCOUNTER_TYPES,
  ENCOUNTER_TYPE_LABEL,
} from "@/lib/encounter";

const today = () => new Date().toISOString().slice(0, 10);

type Mode = null | "done" | "planned";

export default function AddEncounter({ patientId }: { patientId: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(null);
  const [date, setDate] = useState(today());
  const [type, setType] = useState<(typeof ENCOUNTER_TYPES)[number]>("visit");
  const [fields, setFields] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setDate(today());
    setType("visit");
    setFields({});
    setError(null);
    setMode(null);
  }

  async function save() {
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/patients/${patientId}/encounters`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date,
        type,
        status: mode,
        ...(mode === "done" ? fields : {}),
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error || "Не удалось сохранить");
      return;
    }
    reset();
    router.refresh();
  }

  if (!mode) {
    return (
      <div style={{ display: "flex", gap: 16 }}>
        <button className="link-btn" onClick={() => setMode("done")}>
          + Добавить запись
        </button>
        <button className="link-btn" onClick={() => setMode("planned")}>
          + Запланировать приём
        </button>
      </div>
    );
  }

  const planned = mode === "planned";

  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <div className="field" style={{ flex: "0 0 180px" }}>
          <label>Дата</label>
          <input
            type="date"
            value={date}
            min={planned ? today() : undefined}
            max={planned ? undefined : today()}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
        <div className="field" style={{ flex: "0 0 200px" }}>
          <label>Тип</label>
          <select value={type} onChange={(e) => setType(e.target.value as typeof type)}>
            {ENCOUNTER_TYPES.map((t) => (
              <option key={t} value={t}>
                {ENCOUNTER_TYPE_LABEL[t]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {planned ? (
        <p className="hint">
          Запланированный приём напомнит пациенту в боте за день. Содержание заполните после
          приёма — отметьте его состоявшимся или добавьте отдельную запись.
        </p>
      ) : (
        ENCOUNTER_FIELDS.map((f) => (
          <div className="field" key={f}>
            <label>{ENCOUNTER_FIELD_LABEL[f]}</label>
            <textarea
              rows={2}
              value={fields[f] ?? ""}
              onChange={(e) => setFields((prev) => ({ ...prev, [f]: e.target.value }))}
            />
          </div>
        ))
      )}

      {error && <p className="error-text">{error}</p>}
      <div style={{ display: "flex", gap: 8 }}>
        <button className="btn-primary btn-inline" onClick={save} disabled={saving}>
          {saving ? "Сохраняем..." : planned ? "Запланировать" : "Сохранить запись"}
        </button>
        <button className="link-btn" onClick={reset}>
          Отмена
        </button>
      </div>
    </div>
  );
}
