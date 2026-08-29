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
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(() => {
    fetch("/api/miniapp/care-links", { headers: miniAppAuthHeaders() })
      .then((r) => r.json())
      .then((d) => {
        setLinks(d.links ?? []);
        setInviteCode(d.inviteCode ?? null);
      })
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

  async function copyCode() {
    if (!inviteCode) return;
    try {
      await navigator.clipboard.writeText(inviteCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard unavailable — the code is on screen to read anyway
    }
  }

  const current = (links ?? []).filter((l) => l.status !== "ended" && l.status !== "declined");
  const hasLinks = current.length > 0;

  // The connect form + the "your own code" line, shared by both layouts.
  const connectForm = (
    <>
      <div className="field">
        <label>Код врача или клиники</label>
        <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Например, DEMO01" />
      </div>
      <button className="btn-primary btn-inline" disabled={busy === "request"} onClick={request}>
        {busy === "request" ? "Отправляем..." : "Отправить запрос"}
      </button>
      {error && <p className="error-text">{error}</p>}

      {inviteCode && (
        <div className="care-code-mine">
          <p className="hint">
            Обычно код даёт врач или клиника, введите его выше. Если врач просит ваш код,
            покажите ему этот:
          </p>
          <div className="care-code-row">
            <code>{inviteCode}</code>
            <button className="link-btn" onClick={copyCode}>
              {copied ? "Скопировано" : "Скопировать"}
            </button>
          </div>
        </div>
      )}

      <p className="hint" style={{ marginTop: 12 }}>
        Завершение связи занимает 7 дней, этот срок можно отменить, если передумаете.
      </p>
    </>
  );

  return (
    <div>
      <BackLink />

      {links === null ? (
        <div className="miniapp-card">
          <h1>Мои врачи</h1>
          <p className="empty">Загрузка...</p>
        </div>
      ) : !hasLinks ? (
        <div className="miniapp-card">
          <h1>Подключите врача</h1>
          <p className="hint" style={{ marginTop: 0 }}>
            Когда вы подключите врача, он будет видеть ваши записи, опросники и колесо баланса.
            Передачу данных можно приостановить или завершить в любой момент.
          </p>
          {connectForm}
        </div>
      ) : (
        <>
          <div className="miniapp-card">
            <h1>Мои врачи</h1>
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
            {error && <p className="error-text">{error}</p>}
          </div>

          <div className="miniapp-card" style={{ marginTop: 16 }}>
            <h2>Подключить ещё одного врача</h2>
            {connectForm}
          </div>
        </>
      )}
    </div>
  );
}
