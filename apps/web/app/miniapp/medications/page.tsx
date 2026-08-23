"use client";

import { useEffect, useState } from "react";
import { miniAppAuthHeaders } from "@/lib/miniappClient";
import BackLink from "@/components/miniapp/BackLink";

interface Medication {
  id: string;
  name: string;
  dosage: string;
  frequency: number;
}

export default function MedicationsPage() {
  const [medications, setMedications] = useState<Medication[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [dosage, setDosage] = useState("");
  const [frequency, setFrequency] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function load() {
    fetch("/api/miniapp/medications", { headers: miniAppAuthHeaders() })
      .then((res) => res.json())
      .then((data) => {
        setMedications(data.medications ?? []);
        setLoading(false);
      });
  }

  useEffect(load, []);

  async function addMedication() {
    const freq = Number(frequency);
    if (!name.trim() || !dosage.trim() || !Number.isInteger(freq) || freq <= 0) {
      setError("Заполните название, дозировку и частоту (целое число раз/день)");
      return;
    }
    setError(null);
    const res = await fetch("/api/miniapp/medications", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...miniAppAuthHeaders() },
      body: JSON.stringify({ name, dosage, frequency: freq }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Не удалось сохранить");
      return;
    }
    setName("");
    setDosage("");
    setFrequency("");
    setAdding(false);
    load();
  }

  async function updateMedication(id: string, field: "name" | "dosage" | "frequency", value: string) {
    const body = field === "frequency" ? { frequency: Number(value) } : { [field]: value };
    await fetch(`/api/miniapp/medications/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...miniAppAuthHeaders() },
      body: JSON.stringify(body),
    });
    load();
  }

  async function deleteMedication(id: string) {
    await fetch(`/api/miniapp/medications/${id}`, { method: "DELETE", headers: miniAppAuthHeaders() });
    if (editingId === id) setEditingId(null);
    load();
  }

  return (
    <div>
      <BackLink />
      <div className="miniapp-card">
        <h1>Медикаменты</h1>

        {loading ? (
          <p className="empty">Загрузка...</p>
        ) : medications.length === 0 ? (
          <p className="empty">У вас пока нет сохранённых медикаментов.</p>
        ) : (
          <ul className="miniapp-med-list">
            {medications.map((m) =>
              editingId === m.id ? (
                <li key={m.id} className="miniapp-med-row">
                  <div className="field">
                    <label>Название</label>
                    <input defaultValue={m.name} onBlur={(e) => updateMedication(m.id, "name", e.target.value)} />
                  </div>
                  <div className="field">
                    <label>Дозировка</label>
                    <input defaultValue={m.dosage} onBlur={(e) => updateMedication(m.id, "dosage", e.target.value)} />
                  </div>
                  <div className="field">
                    <label>Раз/день</label>
                    <input
                      type="number"
                      defaultValue={m.frequency}
                      onBlur={(e) => updateMedication(m.id, "frequency", e.target.value)}
                    />
                  </div>
                  <button className="link-btn" onClick={() => setEditingId(null)}>
                    Готово
                  </button>
                </li>
              ) : (
                <li key={m.id} className="miniapp-med-row">
                  <span>
                    <strong>{m.name}</strong>, доза: {m.dosage}, {m.frequency} раз/день
                  </span>
                  <span>
                    <button className="link-btn" onClick={() => setEditingId(m.id)}>
                      Изменить
                    </button>{" "}
                    <button className="link-btn" onClick={() => deleteMedication(m.id)}>
                      Удалить
                    </button>
                  </span>
                </li>
              )
            )}
          </ul>
        )}

        {adding ? (
          <div style={{ marginTop: 16 }}>
            <div className="field">
              <label>Название</label>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Кветиапин" />
            </div>
            <div className="field">
              <label>Дозировка</label>
              <input value={dosage} onChange={(e) => setDosage(e.target.value)} placeholder="200 мг" />
            </div>
            <div className="field">
              <label>Раз в день</label>
              <input
                type="number"
                value={frequency}
                onChange={(e) => setFrequency(e.target.value)}
                placeholder="2"
              />
            </div>
            {error && <p className="error-text">{error}</p>}
            <button className="btn-primary btn-inline" onClick={addMedication}>
              Сохранить
            </button>{" "}
            <button className="link-btn" onClick={() => setAdding(false)}>
              Отмена
            </button>
          </div>
        ) : (
          <button className="btn-primary btn-inline" style={{ marginTop: 16 }} onClick={() => setAdding(true)}>
            + Добавить
          </button>
        )}
      </div>
    </div>
  );
}
