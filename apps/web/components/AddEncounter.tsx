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

export default function AddEncounter({ patientId }: { patientId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
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
    setOpen(false);
  }

  async function save() {
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/patients/${patientId}/encounters`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, type, ...fields }),
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

  if (!open) {
    return (
      <button className="link-btn" onClick={() => setOpen(true)}>
        + Добавить запись
      </button>
    );
  }

  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <div className="field" style={{ flex: "0 0 180px" }}>
          <label>Дата</label>
          <input type="date" value={date} max={today()} onChange={(e) => setDate(e.target.value)} />
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
      {ENCOUNTER_FIELDS.map((f) => (
        <div className="field" key={f}>
          <label>{ENCOUNTER_FIELD_LABEL[f]}</label>
          <textarea
            rows={2}
            value={fields[f] ?? ""}
            onChange={(e) => setFields((prev) => ({ ...prev, [f]: e.target.value }))}
          />
        </div>
      ))}
      {error && <p className="error-text">{error}</p>}
      <div style={{ display: "flex", gap: 8 }}>
        <button className="btn-primary btn-inline" onClick={save} disabled={saving}>
          {saving ? "Сохраняем..." : "Сохранить запись"}
        </button>
        <button className="link-btn" onClick={reset}>
          Отмена
        </button>
      </div>
    </div>
  );
}
