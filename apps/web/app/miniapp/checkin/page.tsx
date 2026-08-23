"use client";

import { useEffect, useState } from "react";
import { miniAppAuthHeaders } from "@/lib/miniappClient";
import BackLink from "@/components/miniapp/BackLink";

const MOOD_OPTIONS: [string, number][] = [
  ["😞", -2],
  ["🙁", -1],
  ["😐", 0],
  ["🙂", 1],
  ["😄", 2],
];

const MOOD_EMOJI: Record<number, string> = { [-2]: "😞", [-1]: "🙁", 0: "😐", 1: "🙂", 2: "😄" };

interface CheckIn {
  id: string;
  date: string;
  mood: number;
  sleepHours: number | null;
  energyLevel: number | null;
  medsTaken: boolean | null;
}

export default function CheckinPage() {
  const [mood, setMood] = useState<number | null>(null);
  const [sleepHours, setSleepHours] = useState("");
  const [energyLevel, setEnergyLevel] = useState<number | null>(null);
  const [medsTaken, setMedsTaken] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<CheckIn[]>([]);

  useEffect(() => {
    fetch("/api/miniapp/checkin", { headers: miniAppAuthHeaders() })
      .then((res) => res.json())
      .then((data) => setHistory(data.checkIns ?? []));
  }, []);

  async function submit() {
    if (mood === null) {
      setError("Выберите настроение");
      return;
    }
    setSaving(true);
    setError(null);
    const res = await fetch("/api/miniapp/checkin", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...miniAppAuthHeaders() },
      body: JSON.stringify({
        mood,
        sleepHours: sleepHours ? Number(sleepHours.replace(",", ".")) : null,
        energyLevel,
        medsTaken,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Не удалось сохранить");
      return;
    }
    setSaved(true);
  }

  return (
    <div>
      <BackLink />
      <div className="miniapp-card">
        {saved ? (
          <p className="hint">Спасибо! Данные сохранены. Хорошего дня 🙌</p>
        ) : (
          <>
            <h1>Как ваше настроение сегодня?</h1>
            <div className="miniapp-word-grid">
              {MOOD_OPTIONS.map(([label, value]) => (
                <button
                  key={value}
                  type="button"
                  className={`miniapp-word-chip ${mood === value ? "active" : ""}`}
                  onClick={() => setMood(value)}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="field">
              <label>Сколько часов вы спали этой ночью?</label>
              <input
                type="number"
                step="0.5"
                value={sleepHours}
                onChange={(e) => setSleepHours(e.target.value)}
                placeholder="7.5"
              />
            </div>

            <div className="field">
              <label>Уровень энергии (1-5)</label>
              <div className="miniapp-word-grid">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    className={`miniapp-word-chip ${energyLevel === n ? "active" : ""}`}
                    onClick={() => setEnergyLevel(n)}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            <div className="field">
              <label>Принимали лекарства сегодня?</label>
              <div className="miniapp-word-grid">
                <button
                  type="button"
                  className={`miniapp-word-chip ${medsTaken === true ? "active" : ""}`}
                  onClick={() => setMedsTaken(true)}
                >
                  Да
                </button>
                <button
                  type="button"
                  className={`miniapp-word-chip ${medsTaken === false ? "active" : ""}`}
                  onClick={() => setMedsTaken(false)}
                >
                  Нет
                </button>
              </div>
            </div>

            {error && <p className="error-text">{error}</p>}
            <button className="btn-primary btn-inline" onClick={submit} disabled={saving}>
              {saving ? "Сохраняем..." : "Сохранить"}
            </button>
          </>
        )}
      </div>

      {history.length > 0 && (
        <div className="miniapp-card" style={{ marginTop: 16 }}>
          <h2>Последние отметки</h2>
          <table className="responses">
            <thead>
              <tr>
                <th>Дата</th>
                <th>Настроение</th>
                <th>Сон</th>
                <th>Энергия</th>
                <th>Лекарства</th>
              </tr>
            </thead>
            <tbody>
              {history.map((c) => (
                <tr key={c.id}>
                  <td>{new Date(c.date).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" })}</td>
                  <td>{MOOD_EMOJI[c.mood] ?? c.mood}</td>
                  <td>{c.sleepHours != null ? `${c.sleepHours.toFixed(1)} ч` : "—"}</td>
                  <td>{c.energyLevel ?? "—"}</td>
                  <td>{c.medsTaken === null ? "—" : c.medsTaken ? "✅" : "⛔️"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
