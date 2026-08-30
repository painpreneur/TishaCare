"use client";

import { useEffect, useMemo, useState } from "react";
import { miniAppAuthHeaders } from "@/lib/miniappClient";
import BackLink from "@/components/miniapp/BackLink";
import {
  EMOTIONS,
  GUIDED_STEPS,
  emotionLabels,
  parseEmotions,
  type ThoughtKind,
} from "@/lib/thoughts";

interface Thought {
  id: string;
  kind: ThoughtKind;
  content: string | null;
  situation: string | null;
  reframe: string | null;
  emotions: string | null;
  intensity: number | null;
  createdAt: string;
}

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("ru-RU", { day: "2-digit", month: "long", year: "numeric" });
const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });

// Shared by /miniapp/thoughts and /app/thoughts.
export default function ThoughtsJournal() {
  const [thoughts, setThoughts] = useState<Thought[]>([]);
  const [loaded, setLoaded] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [kind, setKind] = useState<ThoughtKind>("free");
  const [content, setContent] = useState("");
  const [situation, setSituation] = useState("");
  const [reframe, setReframe] = useState("");
  const [emotions, setEmotions] = useState<string[]>([]);
  const [intensity, setIntensity] = useState(5);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function load() {
    fetch("/api/miniapp/thoughts", { headers: miniAppAuthHeaders() })
      .then((res) => res.json())
      .then((data) => {
        setThoughts(data.thoughts ?? []);
        setLoaded(true);
      });
  }
  useEffect(load, []);

  function resetForm() {
    setEditingId(null);
    setKind("free");
    setContent("");
    setSituation("");
    setReframe("");
    setEmotions([]);
    setIntensity(5);
    setError(null);
  }

  function startEdit(t: Thought) {
    setEditingId(t.id);
    setKind(t.kind);
    setContent(t.content ?? "");
    setSituation(t.situation ?? "");
    setReframe(t.reframe ?? "");
    setEmotions(parseEmotions(t.emotions));
    setIntensity(t.intensity ?? 5);
    setError(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function toggleEmotion(id: string) {
    setEmotions((cur) => (cur.includes(id) ? cur.filter((e) => e !== id) : [...cur, id]));
  }

  async function save() {
    if (!content.trim()) {
      setError(kind === "free" ? "Введите текст" : "Запишите саму мысль");
      return;
    }
    setSaving(true);
    setError(null);
    const body = {
      kind,
      content,
      situation: kind === "guided" ? situation : undefined,
      reframe: kind === "guided" ? reframe : undefined,
      emotions,
      intensity: emotions.length ? intensity : null,
    };
    const res = await fetch(
      editingId ? `/api/miniapp/thoughts/${editingId}` : "/api/miniapp/thoughts",
      {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json", ...miniAppAuthHeaders() },
        body: JSON.stringify(body),
      },
    );
    setSaving(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error || "Не удалось сохранить");
      return;
    }
    resetForm();
    load();
  }

  async function remove(id: string) {
    if (!window.confirm("Удалить эту запись?")) return;
    const res = await fetch(`/api/miniapp/thoughts/${id}`, {
      method: "DELETE",
      headers: miniAppAuthHeaders(),
    });
    if (res.ok) {
      if (editingId === id) resetForm();
      load();
    }
  }

  const grouped = useMemo(() => {
    const map = new Map<string, Thought[]>();
    for (const t of thoughts) {
      const day = fmtDate(t.createdAt);
      const bucket = map.get(day);
      if (bucket) bucket.push(t);
      else map.set(day, [t]);
    }
    return [...map.entries()];
  }, [thoughts]);

  return (
    <div>
      <BackLink />

      <div className="miniapp-card">
        <h1>Дневник мыслей</h1>

        <div className="miniapp-word-grid" style={{ margin: "8px 0 4px" }}>
          <button
            type="button"
            className={`miniapp-word-chip ${kind === "free" ? "active" : ""}`}
            onClick={() => setKind("free")}
          >
            Свободно
          </button>
          <button
            type="button"
            className={`miniapp-word-chip ${kind === "guided" ? "active" : ""}`}
            onClick={() => setKind("guided")}
          >
            Разобрать
          </button>
        </div>

        {kind === "free" ? (
          <>
            <p className="hint" style={{ marginTop: 8 }}>
              Просто запишите, что на уме. Это останется здесь.
            </p>
            <div className="field">
              <textarea
                rows={4}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Что вас беспокоит?"
              />
            </div>
          </>
        ) : (
          <>
            <p className="hint" style={{ marginTop: 8 }}>
              Короткий разбор: что случилось, какая мысль пришла и как ещё можно на это посмотреть.
            </p>
            {GUIDED_STEPS.map((step) => {
              const val = step.key === "situation" ? situation : step.key === "reframe" ? reframe : content;
              const set =
                step.key === "situation" ? setSituation : step.key === "reframe" ? setReframe : setContent;
              return (
                <div className="field" key={step.key}>
                  <label>{step.label}</label>
                  <textarea
                    rows={step.key === "content" ? 3 : 2}
                    value={val}
                    onChange={(e) => set(e.target.value)}
                    placeholder={step.placeholder}
                  />
                </div>
              );
            })}
          </>
        )}

        <label className="thought-field-label">Что при этом чувствовали?</label>
        <div className="miniapp-word-grid" style={{ margin: "6px 0" }}>
          {EMOTIONS.map((em) => (
            <button
              key={em.id}
              type="button"
              className={`miniapp-word-chip ${emotions.includes(em.id) ? "active" : ""}`}
              onClick={() => toggleEmotion(em.id)}
            >
              {em.label}
            </button>
          ))}
        </div>

        {emotions.length > 0 && (
          <div className="field">
            <label>Насколько сильно: {intensity}/10</label>
            <input
              type="range"
              min={0}
              max={10}
              value={intensity}
              onChange={(e) => setIntensity(Number(e.target.value))}
            />
          </div>
        )}

        {error && <p className="error-text">{error}</p>}

        <div className="thought-form-actions">
          <button className="btn-primary btn-inline" onClick={save} disabled={saving}>
            {saving ? "Сохраняем..." : editingId ? "Сохранить изменения" : "Сохранить"}
          </button>
          {editingId && (
            <button type="button" className="link-btn" onClick={resetForm}>
              Отменить
            </button>
          )}
        </div>
      </div>

      {loaded && thoughts.length === 0 && (
        <div className="miniapp-card" style={{ marginTop: 16 }}>
          <p className="empty">Здесь появятся ваши записи.</p>
        </div>
      )}

      {grouped.map(([day, items]) => (
        <div className="miniapp-card thought-day" key={day} style={{ marginTop: 16 }}>
          <h3>{day}</h3>
          <ul className="thought-list">
            {items.map((t) => {
              const ems = parseEmotions(t.emotions);
              return (
                <li key={t.id} className={editingId === t.id ? "editing" : ""}>
                  <span className="thought-date">{fmtTime(t.createdAt)}</span>
                  {t.kind === "guided" ? (
                    <div className="thought-guided">
                      {t.situation && (
                        <p>
                          <em>Ситуация:</em> {t.situation}
                        </p>
                      )}
                      {t.content && (
                        <p>
                          <em>Мысль:</em> {t.content}
                        </p>
                      )}
                      {t.reframe && (
                        <p>
                          <em>Другой взгляд:</em> {t.reframe}
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="thought-body">{t.content}</p>
                  )}
                  {ems.length > 0 && (
                    <p className="thought-emotions">
                      {emotionLabels(ems).join(", ")}
                      {t.intensity != null && ` · ${t.intensity}/10`}
                    </p>
                  )}
                  <div className="thought-item-actions">
                    <button type="button" className="link-btn" onClick={() => startEdit(t)}>
                      Изменить
                    </button>
                    <button type="button" className="link-btn danger" onClick={() => remove(t.id)}>
                      Удалить
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}
