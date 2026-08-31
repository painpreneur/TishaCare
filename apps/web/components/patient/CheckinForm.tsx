"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { miniAppAuthHeaders, withDevTelegramIdParam } from "@/lib/miniappClient";
import { usePatientBasePath } from "@/lib/patientPortal";
import BackLink from "@/components/miniapp/BackLink";
import {
  MOOD_SCALE,
  MOOD_EMOJI,
  STATE_TAGS,
  MEDS_OPTIONS,
  MEDS_LABEL,
  NOTE_MAX_LENGTH,
  parseStateTags,
  stateTagLabels,
  type MedsStatus,
} from "@/lib/checkin";
import MoodFace from "./checkin/MoodFace";
import EnergyMeter from "./checkin/EnergyMeter";
import SleepStepper from "./checkin/SleepStepper";

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
type Step = "mood" | "tags" | "energy" | "note" | "sleep" | "meds";

const STEPS: Record<Mode, Step[]> = {
  moment: ["mood", "tags", "energy", "note"],
  day: ["mood", "sleep", "meds"],
};

const STEP_TITLE: Record<Step, string> = {
  mood: "Как настроение?",
  tags: "Как это ощущается?",
  energy: "Сколько энергии?",
  note: "Что повлияло?",
  sleep: "Сколько спали этой ночью?",
  meds: "Приняли лекарства сегодня?",
};

// Shared by /miniapp/checkin and /app/checkin.
export default function CheckinForm() {
  const base = usePatientBasePath();
  const [mode, setMode] = useState<Mode>("moment");
  const [stepIdx, setStepIdx] = useState(0);
  const [dir, setDir] = useState<1 | -1>(1);
  const [saved, setSaved] = useState(false);

  const [mood, setMood] = useState<number | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [energyLevel, setEnergyLevel] = useState<number | null>(null);
  const [note, setNote] = useState("");
  const [sleepHours, setSleepHours] = useState("");
  const [meds, setMeds] = useState<MedsStatus | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<CheckIn[]>([]);

  const touchX = useRef<number | null>(null);

  function load() {
    fetch("/api/miniapp/checkin", { headers: miniAppAuthHeaders() })
      .then((res) => res.json())
      .then((data) => setHistory(data.checkIns ?? []));
  }
  useEffect(load, []);

  const steps = STEPS[mode];
  const step = steps[stepIdx];
  const isLast = stepIdx === steps.length - 1;

  function reset() {
    setMood(null);
    setTags([]);
    setEnergyLevel(null);
    setNote("");
    setSleepHours("");
    setMeds(null);
    setError(null);
    setStepIdx(0);
    setDir(1);
    setSaved(false);
  }

  function switchMode(next: Mode) {
    setMode(next);
    reset();
  }

  function toggleTag(id: string) {
    setTags((cur) => (cur.includes(id) ? cur.filter((t) => t !== id) : [...cur, id]));
  }

  function go(delta: 1 | -1) {
    if (delta === 1) {
      if (step === "mood" && mood === null) {
        setError("Выберите настроение");
        return;
      }
      if (isLast) {
        submit();
        return;
      }
    }
    setError(null);
    setDir(delta);
    setStepIdx((i) => Math.max(0, Math.min(steps.length - 1, i + delta)));
  }

  function onTouchStart(e: React.TouchEvent) {
    touchX.current = e.touches[0].clientX;
  }
  function onTouchEnd(e: React.TouchEvent) {
    if (touchX.current == null) return;
    const dx = e.changedTouches[0].clientX - touchX.current;
    touchX.current = null;
    if (Math.abs(dx) < 55) return;
    if (dx < 0) go(1);
    else if (stepIdx > 0) go(-1);
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
    setSaved(true);
    load();
  }

  const recap = [
    mood !== null ? MOOD_EMOJI[mood] : null,
    tags.length ? stateTagLabels(tags).join(", ") : null,
    energyLevel ? `энергия ${energyLevel}/5` : null,
    sleepHours ? `сон ${sleepHours.replace(",", ".")} ч` : null,
    meds ? `лекарства ${MEDS_LABEL[meds]}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

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
            onClick={() => switchMode("moment")}
          >
            Отметить сейчас
          </button>
          <button
            type="button"
            className={`checkin-mode ${mode === "day" ? "active" : ""}`}
            onClick={() => switchMode("day")}
          >
            Итог дня
          </button>
        </div>

        {saved ? (
          <div className="checkin-done">
            <div className="checkin-done-check" aria-hidden="true">
              <svg width="56" height="56" viewBox="0 0 56 56">
                <circle cx="28" cy="28" r="26" fill="#e5f6ea" />
                <path
                  d="M17 29 L25 37 L40 20"
                  stroke="#1f9d4b"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />
              </svg>
            </div>
            <h1>Готово, я записал ваши ответы</h1>
            {recap && <p className="checkin-done-recap">{recap}</p>}
            {mood !== null && mood <= -1 && (
              <p className="checkin-done-safety">
                Если сейчас тяжело, можно открыть{" "}
                <Link href={withDevTelegramIdParam(`${base}/safety`)}>план на трудный момент</Link>.
              </p>
            )}
            <button className="btn-primary btn-inline" onClick={reset}>
              Отметить ещё
            </button>
          </div>
        ) : (
          <div className="checkin-wiz">
            <div className="checkin-wiz-progress" aria-hidden="true">
              {steps.map((s, i) => (
                <span
                  key={s}
                  className={`checkin-wiz-dot ${i === stepIdx ? "active" : ""} ${i < stepIdx ? "done" : ""}`}
                />
              ))}
            </div>

            <div
              key={`${mode}-${step}`}
              className={`checkin-wiz-step ${dir === 1 ? "in-right" : "in-left"}`}
              onTouchStart={onTouchStart}
              onTouchEnd={onTouchEnd}
            >
              <h1>{STEP_TITLE[step]}</h1>

              {step === "mood" && (
                <>
                  <div className="mood-face-wrap">
                    <MoodFace value={mood ?? 0} />
                  </div>
                  <div className="mood-row">
                    {MOOD_SCALE.map((m) => (
                      <button
                        key={m.value}
                        type="button"
                        className={`mood-dot ${mood === m.value ? "active" : ""}`}
                        aria-label={String(m.value)}
                        onClick={() => {
                          setMood(m.value);
                          setError(null);
                        }}
                      >
                        {m.emoji}
                      </button>
                    ))}
                  </div>
                </>
              )}

              {step === "tags" && (
                <>
                  <p className="hint" style={{ marginTop: 0 }}>Необязательно. Можно несколько.</p>
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
                </>
              )}

              {step === "energy" && (
                <>
                  <p className="hint" style={{ marginTop: 0 }}>Необязательно.</p>
                  <EnergyMeter value={energyLevel} onChange={setEnergyLevel} />
                </>
              )}

              {step === "note" && (
                <textarea
                  className="checkin-note-input"
                  rows={5}
                  maxLength={NOTE_MAX_LENGTH}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Пара слов, почему так (необязательно)"
                />
              )}

              {step === "sleep" && <SleepStepper value={sleepHours} onChange={setSleepHours} />}

              {step === "meds" && (
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
              )}
            </div>

            {error && <p className="error-text">{error}</p>}

            <div className="checkin-wiz-nav">
              <div className="checkin-wiz-nav-row">
                <button
                  type="button"
                  className="link-btn"
                  onClick={() => go(-1)}
                  disabled={stepIdx === 0}
                >
                  ← Назад
                </button>
                <span className="checkin-wiz-count">
                  {stepIdx + 1} / {steps.length}
                </span>
              </div>
              <button
                type="button"
                className="btn-primary checkin-wiz-next"
                onClick={() => go(1)}
                disabled={saving}
              >
                {isLast ? (saving ? "Сохраняем..." : "Сохранить") : "Далее"}
              </button>
            </div>
          </div>
        )}

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
