"use client";

import { useCallback, useEffect, useState } from "react";
import { miniAppAuthHeaders } from "@/lib/miniappClient";
import BackLink from "@/components/miniapp/BackLink";

interface CareLink {
  id: string;
  status: string;
  requestedBy: string;
  managedByClinic: boolean;
  endsAt: string | null;
  doctorName: string;
  clinicName: string | null;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" });
}

const STATUS_LABEL: Record<string, string> = {
  pending: "Запрос отправлен, ждём подтверждения врача",
  active: "Активная связь",
  paused: "Передача данных приостановлена",
  ending: "Связь завершается",
};

export default function CareLinksPanel() {
  const [links, setLinks] = useState<CareLink[] | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    fetch("/api/miniapp/care-links", { headers: miniAppAuthHeaders() })
      .then((r) => r.json())
      .then((d) => setLinks(d.links ?? []))
      .catch(() => setLinks([]));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function act(id: string, action: string) {
    setBusy(id);
    setError(null);
    const res = await fetch(`/api/miniapp/care-links/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...miniAppAuthHeaders() },
      body: JSON.stringify({ action }),
    });
    setBusy(null);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error || "Не удалось выполнить действие");
      return;
    }
    load();
  }

  async function request() {
    if (!code.trim()) return;
    setBusy("request");
    setError(null);
    const res = await fetch("/api/miniapp/care-links", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...miniAppAuthHeaders() },
      body: JSON.stringify({ connectCode: code }),
    });
    setBusy(null);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error || "Не удалось отправить запрос");
      return;
    }
    setCode("");
    load();
  }

  const current = (links ?? []).filter((l) => l.status !== "ended" && l.status !== "declined");

  return (
    <div>
      <BackLink />
      <div className="miniapp-card">
        <h1>Мои врачи</h1>
        {links === null ? (
          <p className="empty">Загрузка...</p>
        ) : current.length === 0 ? (
          <p className="empty">Вы пока не связаны ни с одним врачом.</p>
        ) : (
          <ul className="care-link-list">
            {current.map((l) => (
              <li key={l.id}>
                <div className="care-link-name">{l.doctorName}</div>
                {l.clinicName && <div className="hint">{l.clinicName}</div>}
                <div className="hint">
                  {STATUS_LABEL[l.status] ?? l.status}
                  {l.status === "ending" && l.endsAt && ` ${formatDate(l.endsAt)}`}
                  {l.managedByClinic && " · ведёт клиника"}
                </div>
                <div className="care-link-actions">
                  {l.status === "active" && (
                    <button className="link-btn" disabled={busy === l.id} onClick={() => act(l.id, "pause")}>
                      Приостановить
                    </button>
                  )}
                  {l.status === "paused" && (
                    <button className="link-btn" disabled={busy === l.id} onClick={() => act(l.id, "resume")}>
                      Возобновить
                    </button>
                  )}
                  {(l.status === "active" || l.status === "paused") && !l.managedByClinic && (
                    <button className="link-btn danger" disabled={busy === l.id} onClick={() => act(l.id, "end")}>
                      Завершить
                    </button>
                  )}
                  {l.status === "ending" && (
                    <button className="link-btn" disabled={busy === l.id} onClick={() => act(l.id, "cancel-end")}>
                      Отменить завершение
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}

        {error && <p className="error-text">{error}</p>}
      </div>

      <div className="miniapp-card" style={{ marginTop: 16 }}>
        <h2>Подключиться к врачу</h2>
        <p className="hint">Введите код, который дал вам врач.</p>
        <div className="field">
          <label>Код врача</label>
          <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Например, DEMO01" />
        </div>
        <button className="btn-primary btn-inline" disabled={busy === "request"} onClick={request}>
          {busy === "request" ? "Отправляем..." : "Отправить запрос"}
        </button>
        <p className="hint" style={{ marginTop: 12 }}>
          Завершение связи занимает 7 дней, этот срок можно отменить, если передумаете.
        </p>
      </div>
    </div>
  );
}
