"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Admin-only: deactivate a colleague (login blocked, sessions dropped, care
// links kept) or bring them back. The last active admin can't be deactivated.
export default function DoctorActivationControl({
  doctorId,
  doctorName,
  deactivated,
  lastActiveAdmin,
}: {
  doctorId: string;
  doctorName: string;
  deactivated: boolean;
  lastActiveAdmin: boolean;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function act(action: "deactivate" | "reactivate") {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/clinic/doctors/${doctorId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    setBusy(false);
    setConfirming(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error || "Не удалось выполнить");
      return;
    }
    router.refresh();
  }

  if (deactivated) {
    return (
      <div style={{ marginTop: 4 }}>
        <button type="button" className="link-btn" disabled={busy} onClick={() => act("reactivate")}>
          Вернуть в клинику
        </button>
        {error && <span className="error-text" style={{ marginLeft: 8 }}>{error}</span>}
      </div>
    );
  }

  if (lastActiveAdmin) {
    return <p className="empty" style={{ marginTop: 4 }}>Единственный активный администратор</p>;
  }

  if (!confirming) {
    return (
      <div style={{ marginTop: 4 }}>
        <button type="button" className="link-btn danger" onClick={() => setConfirming(true)}>
          Отключить
        </button>
      </div>
    );
  }

  return (
    <div className="unlink-confirm">
      <span>
        Отключить {doctorName}? Вход будет закрыт, но записи о пациентах сохранятся, и они
        станут доступны вам.
      </span>
      <button className="link-btn danger" disabled={busy} onClick={() => act("deactivate")}>
        {busy ? "..." : "Отключить"}
      </button>
      <button className="link-btn" onClick={() => setConfirming(false)}>
        Отмена
      </button>
      {error && <span className="error-text">{error}</span>}
    </div>
  );
}
