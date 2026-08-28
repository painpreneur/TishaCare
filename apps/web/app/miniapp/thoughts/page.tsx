"use client";

import { useEffect, useState } from "react";
import { miniAppAuthHeaders } from "@/lib/miniappClient";
import BackLink from "@/components/miniapp/BackLink";

interface Thought {
  id: string;
  content: string;
  createdAt: string;
}

export default function ThoughtsPage() {
  const [thoughts, setThoughts] = useState<Thought[]>([]);
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);

  function load() {
    fetch("/api/miniapp/thoughts", { headers: miniAppAuthHeaders() })
      .then((res) => res.json())
      .then((data) => setThoughts(data.thoughts ?? []));
  }

  useEffect(load, []);

  async function save() {
    if (!value.trim()) return;
    setSaving(true);
    await fetch("/api/miniapp/thoughts", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...miniAppAuthHeaders() },
      body: JSON.stringify({ content: value }),
    });
    setValue("");
    setSaving(false);
    load();
  }

  return (
    <div>
      <BackLink />
      <div className="miniapp-card">
        <h1>Дневник мыслей</h1>
        <p className="hint">Поделитесь мыслью, она сохранится здесь.</p>
        <div className="field">
          <textarea rows={3} value={value} onChange={(e) => setValue(e.target.value)} placeholder="Что вас беспокоит?" />
        </div>
        <button className="btn-primary btn-inline" onClick={save} disabled={saving || !value.trim()}>
          {saving ? "Сохраняем..." : "Сохранить"}
        </button>
      </div>

      {thoughts.length > 0 && (
        <div className="miniapp-card" style={{ marginTop: 16 }}>
          <h2>Ваши мысли</h2>
          <ul className="thought-list">
            {thoughts.map((t) => (
              <li key={t.id}>
                <span className="thought-date">{new Date(t.createdAt).toLocaleDateString("ru-RU")}</span>
                <span>{t.content}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
