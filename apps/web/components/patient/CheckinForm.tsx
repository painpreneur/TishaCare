"use client";

import { useEffect, useState } from "react";
import { miniAppAuthHeaders } from "@/lib/miniappClient";
import BackLink from "@/components/miniapp/BackLink";
import {
  STATE_TAGS,
  MEDS_OPTIONS,
  MEDS_LABEL,
  NOTE_MAX_LENGTH,
  parseStateTags,
  stateTagLabels,
  type MedsStatus,
} from "@/lib/checkin";

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
  stateTags: string | null;
  note: string | null;
  sleepHours: number | null;
  energyLevel: number | null;
  medsStatus: string | null;
}

type Mode = "moment" | "day";

// Shared by /miniapp/checkin and /app/checkin.
export default function CheckinForm() {
  const [mode, setMode] = useState<Mode>("moment");
  const [mood, setMood] = useState<number | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [energyLevel, setEnergyLevel] = useState<number | null>(null);
  const [note, setNote] = useState("");
  const [sleepHours, setSleepHours] = useState("");
  const [meds, setMeds] = useState<MedsStatus | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<CheckIn[]>([]);

  function load() {
    fetch("/api/miniapp/checkin", { headers: miniAppAuthHeaders() })
      .then((res) => res.json())
      .then((data) => setHistory(data.checkIns ?? []));
  }
  useEffect(load, []);

  function reset() {
    setMood(null);
    setTags([]);
    setEnergyLevel(null);
    setNote("");
    setSleepHours("");
    setMeds(null);
    setError(null);
  }

  function toggleTag(id: string) {
    setTags((cur) => (cur.includes(id) ? cur.filter((t) => t !== id) : [...cur, id]));
  }

  async function submit() {
    if (mood === null) {
      setError("Выберите настроение");
      return;
    }
    setSaving(true);
    setError(null);
    const body =
      mode === "moment"
        ? { mood, stateTags: tags, energyLevel, note }
        : {
            mood,
            sleepHours: sleepHours ? Number(sleepHours.replace(",", ".")) : null,
            medsStatus: meds,
          };
    const res = await fetch("/api/miniapp/checkin", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...miniAppAuthHeaders() },
      body: JSON.stringify(body),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Не удалось сохранить");
      return;
    }
    reset();
    load();
  }

  const todayKey = new Date().toISOString().slice(0, 10);
  const today = history.filter((c) => new Date(c.date).toISOString().slice(0, 10) === todayKey);

  return (
    <div>
      <BackLink />

      <div className="miniapp-card">
        <div className="checkin-modes">
          <button
            type="button"
            className={`checkin-mode ${mode === "moment" ? "active" : ""}`}
            onClick={() => {
              setMode("moment");
              reset();
            }}
          >
            Отметить сейчас
          </button>
          <button
            type="button"
            className={`checkin-mode ${mode === "day" ? "active" : ""}`}
            onClick={() => {
              setMode("day");
              reset();
            }}
          >
            Итог дня
          </button>
        </div>

        <h1>{mode === "moment" ? "Как сейчас?" : "Как прошёл день?"}</h1>

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

        {mode === "moment" ? (
          <>
            <div className="field">
              <label>Состояние (необязательно)</label>
              <div className="miniapp-word-grid">
                {STATE_TAGS.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    className={`miniapp-word-chip ${tags.includes(t.id) ? "active" : ""}`}
                    onClick={() => toggleTag(t.id)}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="field">
              <label>Уровень энергии (1-5, необязательно)</label>
              <div className="miniapp-word-grid">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    className={`miniapp-word-chip ${energyLevel === n ? "active" : ""}`}
                    onClick={() => setEnergyLevel(energyLevel === n ? null : n)}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            <div className="field">
              <label>Что повлияло? (необязательно)</label>
              <textarea
                rows={2}
                maxLength={NOTE_MAX_LENGTH}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Пара слов, почему так"
              />
            </div>
          </>
        ) : (
          <>
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
              <label>Принимали лекарства сегодня?</label>
              <div className="miniapp-word-grid">
                {MEDS_OPTIONS.map((o) => (
                  <button
                    key={o.id}
                    type="button"
                    className={`miniapp-word-chip ${meds === o.id ? "active" : ""}`}
                    onClick={() => setMeds(o.id)}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {error && <p className="error-text">{error}</p>}
        <button className="btn-primary btn-inline" onClick={submit} disabled={saving}>
          {saving ? "Сохраняем..." : "Сохранить"}
        </button>

        {today.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <p className="hint" style={{ marginTop: 0 }}>Сегодня отмечено:</p>
            <ul className="checkin-today">
              {[...today]
                .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                .map((c) => (
                  <li key={c.id}>
                    <span className="checkin-today-time">
                      {new Date(c.date).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                    <span>
                      {MOOD_EMOJI[c.mood] ?? c.mood}
                      {parseStateTags(c.stateTags).length > 0 && (
                        <span className="checkin-today-tags">
                          {" "}
                          {stateTagLabels(parseStateTags(c.stateTags)).join(", ")}
                        </span>
                      )}
                      {c.medsStatus && (
                        <span className="checkin-today-tags"> · лекарства {MEDS_LABEL[c.medsStatus as MedsStatus]}</span>
                      )}
                    </span>
                  </li>
                ))}
            </ul>
          </div>
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
                <th>Лекарства</th>
              </tr>
            </thead>
            <tbody>
              {history.map((c) => (
                <tr key={c.id}>
                  <td>
                    {new Date(c.date).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" })}{" "}
                    <span style={{ color: "#9aa4b2" }}>
                      {new Date(c.date).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </td>
                  <td>{MOOD_EMOJI[c.mood] ?? c.mood}</td>
                  <td>{c.sleepHours != null ? `${c.sleepHours.toFixed(1)} ч` : "·"}</td>
                  <td>{c.medsStatus ? MEDS_LABEL[c.medsStatus as MedsStatus] : "·"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
