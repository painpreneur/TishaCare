"use client";

import { useEffect, useState } from "react";
import { miniAppAuthHeaders } from "@/lib/miniappClient";
import { SIDE_EFFECT_TAGS, tagsToLabels } from "@/lib/medication";
import BackLink from "@/components/miniapp/BackLink";

interface Report {
  id: string;
  date: string;
  tolerability: number | null;
  perceivedBenefit: number | null;
  sideEffects: string | null;
  sideEffectTags: string | null;
  note: string | null;
}
interface Medication {
  id: string;
  name: string;
  dosage: string;
  frequency: number;
  status: string;
  reason: string | null;
  startedAt: string;
  endedAt: string | null;
  reports: Report[];
}

const d = (iso: string) => new Date(iso).toLocaleDateString("ru-RU");

function ScalePick({ value, onChange }: { value: number | null; onChange: (n: number) => void }) {
  return (
    <div className="miniapp-word-grid" style={{ margin: "6px 0" }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          className={`miniapp-word-chip ${value === n ? "active" : ""}`}
          onClick={() => onChange(n)}
        >
          {n}
        </button>
      ))}
    </div>
  );
}

export default function MedicationsPanel() {
  const [meds, setMeds] = useState<Medication[] | null>(null);
  // When a doctor is connected they own the list — the patient can record
  // tolerability but not add / stop / delete courses.
  const [managedByDoctor, setManagedByDoctor] = useState(false);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [dosage, setDosage] = useState("");
  const [frequency, setFrequency] = useState("");
  const [reportFor, setReportFor] = useState<string | null>(null);
  const [tolerability, setTolerability] = useState<number | null>(null);
  const [benefit, setBenefit] = useState<number | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [sideText, setSideText] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  function load() {
    fetch("/api/miniapp/medications", { headers: miniAppAuthHeaders() })
      .then((r) => r.json())
      .then((data) => {
        setMeds(data.medications ?? []);
        setManagedByDoctor(!!data.managedByDoctor);
      })
      .catch(() => setMeds([]));
  }
  useEffect(load, []);

  async function api(path: string, body?: unknown, method = "POST") {
    setError(null);
    const res = await fetch(path, {
      method,
      headers: { "Content-Type": "application/json", ...miniAppAuthHeaders() },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Не удалось выполнить");
      return false;
    }
    return true;
  }

  async function addMedication() {
    const freq = Number(frequency);
    if (!name.trim() || !dosage.trim() || !Number.isInteger(freq) || freq <= 0) {
      setError("Заполните название, дозировку и частоту");
      return;
    }
    if (await api("/api/miniapp/medications", { name, dosage, frequency: freq })) {
      setName("");
      setDosage("");
      setFrequency("");
      setAdding(false);
      load();
    }
  }

  function resetReport() {
    setReportFor(null);
    setTolerability(null);
    setBenefit(null);
    setTags([]);
    setSideText("");
    setNote("");
  }

  async function submitReport(id: string) {
    if (
      await api(`/api/miniapp/medications/${id}/reports`, {
        tolerability,
        perceivedBenefit: benefit,
        sideEffectTags: tags,
        sideEffects: sideText,
        note,
      })
    ) {
      resetReport();
      load();
    }
  }

  const active = (meds ?? []).filter((m) => m.status === "active");
  const inactive = (meds ?? []).filter((m) => m.status !== "active");

  function medRow(m: Medication) {
    const last = m.reports[0];
    return (
      <li key={m.id}>
        <div>
          <strong>{m.name}</strong>, {m.dosage}, {m.frequency} раз/день
        </div>
        <div className="hint">
          с {d(m.startedAt)}
          {m.endedAt && ` по ${d(m.endedAt)}`}
          {m.reason && ` · ${m.reason}`}
        </div>
        {last && (
          <div className="hint">
            Переносимость {last.tolerability ?? "?"}/5, польза {last.perceivedBenefit ?? "?"}/5
            {tagsToLabels(last.sideEffectTags).length > 0 && ` · ${tagsToLabels(last.sideEffectTags).join(", ")}`}
          </div>
        )}
        <div className="care-link-actions">
          {m.status === "active" && (
            <button className="link-btn" onClick={() => setReportFor(reportFor === m.id ? null : m.id)}>
              Отметить переносимость
            </button>
          )}
          {!managedByDoctor && m.status === "active" && (
            <button
              className="link-btn danger"
              onClick={async () => {
                if (await api(`/api/miniapp/medications/${m.id}`, { status: "stopped" }, "PATCH")) load();
              }}
            >
              Остановить
            </button>
          )}
          {!managedByDoctor && m.status !== "active" && (
            <button
              className="link-btn"
              onClick={async () => {
                if (await api(`/api/miniapp/medications/${m.id}`, { status: "active" }, "PATCH")) load();
              }}
            >
              Возобновить
            </button>
          )}
        </div>

        {reportFor === m.id && (
          <div style={{ marginTop: 8 }}>
            <div className="field">
              <label>Как переносится? (1 = плохо, 5 = отлично)</label>
              <ScalePick value={tolerability} onChange={setTolerability} />
            </div>
            <div className="field">
              <label>Помогает? (1 = нет, 5 = сильно)</label>
              <ScalePick value={benefit} onChange={setBenefit} />
            </div>
            <div className="field">
              <label>Побочные эффекты</label>
              <div className="miniapp-word-grid">
                {SIDE_EFFECT_TAGS.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    className={`miniapp-word-chip ${tags.includes(t.id) ? "active" : ""}`}
                    onClick={() =>
                      setTags((prev) => (prev.includes(t.id) ? prev.filter((x) => x !== t.id) : [...prev, t.id]))
                    }
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              <textarea
                rows={2}
                placeholder="Опишите подробнее, если нужно"
                value={sideText}
                onChange={(e) => setSideText(e.target.value)}
              />
            </div>
            <div className="field">
              <label>Заметка</label>
              <textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn-primary btn-inline" onClick={() => submitReport(m.id)}>
                Сохранить
              </button>
              <button className="link-btn" onClick={resetReport}>
                Отмена
              </button>
            </div>
          </div>
        )}
      </li>
    );
  }

  return (
    <div>
      <BackLink />
      <div className="miniapp-card">
        <h1>Медикаменты</h1>
        {managedByDoctor && (
          <p className="hint" style={{ marginTop: 0 }}>
            Список препаратов ведёт ваш врач. Вы можете отмечать переносимость по каждому.
          </p>
        )}
        {meds === null ? (
          <p className="empty">Загрузка...</p>
        ) : active.length === 0 && inactive.length === 0 ? (
          <p className="empty">
            {managedByDoctor
              ? "Врач пока не добавил препараты."
              : "У вас пока нет сохранённых медикаментов."}
          </p>
        ) : (
          <>
            {active.length > 0 && <ul className="care-link-list">{active.map(medRow)}</ul>}
            {inactive.length > 0 && (
              <>
                <h2 style={{ marginTop: 16 }}>Отменённые</h2>
                <ul className="care-link-list">{inactive.map(medRow)}</ul>
              </>
            )}
          </>
        )}
        {error && <p className="error-text">{error}</p>}

        {managedByDoctor ? null : adding ? (
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
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn-primary btn-inline" onClick={addMedication}>
                Сохранить
              </button>
              <button className="link-btn" onClick={() => setAdding(false)}>
                Отмена
              </button>
            </div>
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
