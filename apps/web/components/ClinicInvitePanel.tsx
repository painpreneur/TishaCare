"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface PendingInvite {
  id: string;
  email: string | null;
  token: string;
  expiresAt: string;
}

// Admin-only: create a one-time invite link for a colleague and manage the
// pending ones. The link is composed here from the current origin so it works
// on whatever host the panel is served from.
export default function ClinicInvitePanel({ pending }: { pending: PendingInvite[] }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  function link(token: string): string {
    return `${window.location.origin}/register?clinic_invite=${encodeURIComponent(token)}`;
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/clinic/invites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim() || undefined }),
    });
    setBusy(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error || "Не удалось создать приглашение");
      return;
    }
    setEmail("");
    router.refresh();
  }

  async function revoke(id: string) {
    setBusy(true);
    await fetch(`/api/clinic/invites/${id}`, { method: "DELETE" });
    setBusy(false);
    router.refresh();
  }

  async function copy(token: string) {
    try {
      await navigator.clipboard.writeText(link(token));
      setCopied(token);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      // clipboard blocked — the link is on screen to copy by hand
    }
  }

  return (
    <div>
      <form onSubmit={create} className="field" style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
        <div style={{ flex: 1 }}>
          <label>Email коллеги (необязательно)</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="colleague@clinic.ru"
          />
        </div>
        <button className="btn-primary btn-inline" type="submit" disabled={busy}>
          Создать ссылку
        </button>
      </form>
      {error && <p className="error-text">{error}</p>}

      {pending.length === 0 ? (
        <p className="empty">Активных приглашений нет</p>
      ) : (
        <ul className="encounter-list">
          {pending.map((i) => (
            <li key={i.id}>
              <div className="encounter-head">
                <strong>{i.email ?? "Ссылка-приглашение"}</strong>
                <span className="thought-date">
                  до {new Date(i.expiresAt).toLocaleDateString("ru-RU")}
                </span>
              </div>
              <p className="encounter-field" style={{ wordBreak: "break-all" }}>
                <code>{link(i.token)}</code>
              </p>
              <div style={{ display: "flex", gap: 12 }}>
                <button type="button" className="link-btn" onClick={() => copy(i.token)}>
                  {copied === i.token ? "Скопировано" : "Скопировать ссылку"}
                </button>
                <button
                  type="button"
                  className="link-btn danger"
                  disabled={busy}
                  onClick={() => revoke(i.id)}
                >
                  Отозвать
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
