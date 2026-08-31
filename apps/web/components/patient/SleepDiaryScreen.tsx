"use client";

import { useEffect, useMemo, useState } from "react";
import { miniAppAuthHeaders } from "@/lib/miniappClient";
import BackLink from "@/components/miniapp/BackLink";
import {
  computeSleepHours,
  SLEEP_QUALITY_LABEL,
  SLEEP_NOTE_MAX,
  type SleepEntryDto,
} from "@/lib/sleep";

const todayKey = () => new Date().toISOString().slice(0, 10);

function fmtDate(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
  });
}

// A light sleep log, separate from the daily check-in. When both exist for a
// night, this is what the wellbeing chart uses.
export default function SleepDiaryScreen() {
  const [entries, setEntries] = useState<SleepEntryDto[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [date, setDate] = useState(todayKey());
  const [bedtime, setBedtime] = useState("");
  const [wakeTime, setWakeTime] = useState("");
  const [quality, setQuality] = useState<number | null>(null);
  const [note, setNote] = useState("");

  function load() {
    fetch("/api/miniapp/sleep", { headers: miniAppAuthHeaders() })
      .then((r) => r.json())
      .then((d) => setEntries(d.entries ?? []))
      .finally(() => setLoaded(true));
  }
  useEffect(load, []);

  // Prefill the form when the picked date already has an entry.
  useEffect(() => {
    const existing = entries.find((e) => e.date === date);
    if (existing) {
      setBedtime(existing.bedtime ?? "");
      setWakeTime(existing.wakeTime ?? "");
      setQuality(existing.quality);
      setNote(existing.note ?? "");
    }
  }, [date, entries]);

  const hours = useMemo(() => computeSleepHours(bedtime, wakeTime), [bedtime, wakeTime]);

  async function save() {
    if (hours == null) {
      setError("Укажите, когда легли и когда встали");
      return;
    }
    setSaving(true);
    setError(null);
    const res = await fetch("/api/miniapp/sleep", {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...miniAppAuthHeaders() },
      body: JSON.stringify({ date, bedtime, wakeTime, quality, note }),
    });
    setSaving(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error || "Не удалось сохранить");
      return;
    }
    load();
  }

  return (
    <div>
      <BackLink />

      <div className="miniapp-card">
        <h1>Дневник сна</h1>
        <p className="hint" style={{ marginTop: 0 }}>
          Когда легли и когда встали. Это отдельно от чек-ина: если заполнено и то и другое,
          на графике используется эта запись.
        </p>

        <div className="field">
          <label>Ночь на</label>
          <input
            type="date"
            value={date}
            max={todayKey()}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>

        <div style={{ display: "flex", gap: 12 }}>
          <div className="field" style={{ flex: 1 }}>
            <label>Лёг(ла)</label>
            <input type="time" value={bedtime} onChange={(e) => setBedtime(e.target.value)} />
          </div>
          <div className="field" style={{ flex: 1 }}>
            <label>Встал(а)</label>
            <input type="time" value={wakeTime} onChange={(e) => setWakeTime(e.target.value)} />
          </div>
        </div>

        <p className="hint" style={{ marginTop: 0 }}>
          {hours != null ? `Получилось ${hours} ч сна` : "Укажите оба времени"}
        </p>

        <div className="field">
          <label>Как спалось (необязательно)</label>
          <div className="sleep-quality-row">
            {[1, 2, 3, 4, 5].map((q) => (
              <button
                key={q}
                type="button"
                className={`sleep-quality-dot ${quality === q ? "active" : ""}`}
                aria-label={SLEEP_QUALITY_LABEL[q]}
                onClick={() => setQuality(quality === q ? null : q)}
              >
                {q}
              </button>
            ))}
          </div>
          {quality != null && <p className="hint" style={{ marginTop: 4 }}>{SLEEP_QUALITY_LABEL[quality]}</p>}
        </div>

        <div className="field">
          <label>Заметка (необязательно)</label>
          <textarea
            rows={2}
            maxLength={SLEEP_NOTE_MAX}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Просыпался ночью, снилось что-то тревожное…"
          />
        </div>

        {error && <p className="error-text">{error}</p>}
        <button className="btn-primary btn-inline" onClick={save} disabled={saving}>
          {saving ? "Сохраняем..." : "Сохранить"}
        </button>
      </div>

      {loaded && entries.length > 0 && (
        <div className="miniapp-card" style={{ marginTop: 16 }}>
          <h2>Последние ночи</h2>
          <ul className="checkin-today">
            {entries.map((e) => (
              <li key={e.date}>
                <span className="checkin-today-time">{fmtDate(e.date)}</span>
                <span>
                  {e.bedtime && e.wakeTime ? `${e.bedtime} → ${e.wakeTime} · ` : ""}
                  {e.hours} ч
                  {e.quality != null && (
                    <span className="checkin-today-tags"> · {SLEEP_QUALITY_LABEL[e.quality]}</span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
