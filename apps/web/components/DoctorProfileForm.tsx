"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DoctorProfileForm({
  initialName,
  initialEmail,
}: {
  initialName: string;
  initialEmail: string;
}) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [email, setEmail] = useState(initialEmail);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const dirty = name.trim() !== initialName || email.trim().toLowerCase() !== initialEmail;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const res = await fetch("/api/doctor/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email }),
    });
    setBusy(false);
    const d = await res.json().catch(() => ({}));
    if (!res.ok) {
      setMsg({ ok: false, text: d.error || "Не удалось сохранить" });
      return;
    }
    setMsg({ ok: true, text: "Сохранено" });
    router.refresh();
  }

  return (
    <form onSubmit={save} style={{ maxWidth: 420 }}>
      <div className="field">
        <label>Имя</label>
        <input value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="field">
        <label>Email (логин)</label>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      {msg && (
        <p className={msg.ok ? "hint" : "error-text"} style={msg.ok ? { color: "#1f9d4b" } : undefined}>
          {msg.text}
        </p>
      )}
      <button className="btn-primary btn-inline" disabled={busy || !dirty}>
        {busy ? "Сохраняем..." : "Сохранить"}
      </button>
    </form>
  );
}
