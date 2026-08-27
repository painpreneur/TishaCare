"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function PrescribeMedication({ patientId }: { patientId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [dosage, setDosage] = useState("");
  const [frequency, setFrequency] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    const freq = Number(frequency);
    if (!name.trim() || !dosage.trim() || !Number.isInteger(freq) || freq <= 0) {
      setError("Заполните название, дозировку и частоту");
      return;
    }
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/patients/${patientId}/medications`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, dosage, frequency: freq, reason }),
    });
    setSaving(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error || "Не удалось сохранить");
      return;
    }
    setName("");
    setDosage("");
    setFrequency("");
    setReason("");
    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <button className="link-btn" onClick={() => setOpen(true)}>
        + Назначить препарат
      </button>
    );
  }

  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <div className="field" style={{ flex: "1 1 160px" }}>
          <label>Название</label>
          <input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="field" style={{ flex: "0 0 120px" }}>
          <label>Дозировка</label>
          <input value={dosage} onChange={(e) => setDosage(e.target.value)} placeholder="200 мг" />
        </div>
        <div className="field" style={{ flex: "0 0 100px" }}>
          <label>Раз/день</label>
          <input type="number" value={frequency} onChange={(e) => setFrequency(e.target.value)} />
        </div>
      </div>
      <div className="field">
        <label>Показание</label>
        <input value={reason} onChange={(e) => setReason(e.target.value)} />
      </div>
      {error && <p className="error-text">{error}</p>}
      <div style={{ display: "flex", gap: 8 }}>
        <button className="btn-primary btn-inline" onClick={save} disabled={saving}>
          {saving ? "Сохраняем..." : "Назначить"}
        </button>
        <button className="link-btn" onClick={() => setOpen(false)}>
          Отмена
        </button>
      </div>
    </div>
  );
}
