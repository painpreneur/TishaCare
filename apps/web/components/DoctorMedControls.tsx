"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Stop / reactivate a course from the patient card. Stopping opens a small
// reason field; the row stays as the patient's stopped-course history.
export default function DoctorMedControls({
  patientId,
  medId,
  status,
}: {
  patientId: string;
  medId: string;
  status: string;
}) {
  const router = useRouter();
  const [stopping, setStopping] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function patch(body: { status: "stopped" | "active"; reason?: string }) {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/patients/${patientId}/medications/${medId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setBusy(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error || "Не удалось выполнить");
      return;
    }
    setStopping(false);
    setReason("");
    router.refresh();
  }

  if (status !== "active") {
    return (
      <div className="med-controls">
        <button className="link-btn" disabled={busy} onClick={() => patch({ status: "active" })}>
          Возобновить
        </button>
        {error && <span className="error-text">{error}</span>}
      </div>
    );
  }

  if (!stopping) {
    return (
      <div className="med-controls">
        <button className="link-btn danger" onClick={() => setStopping(true)}>
          Остановить
        </button>
      </div>
    );
  }

  return (
    <div className="med-controls med-stop-form">
      <input
        placeholder="Причина отмены"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
      />
      <button
        className="btn-primary btn-inline"
        disabled={busy || !reason.trim()}
        onClick={() => patch({ status: "stopped", reason })}
      >
        {busy ? "..." : "Отменить приём"}
      </button>
      <button className="link-btn" onClick={() => setStopping(false)}>
        Отмена
      </button>
      {error && <span className="error-text">{error}</span>}
    </div>
  );
}
