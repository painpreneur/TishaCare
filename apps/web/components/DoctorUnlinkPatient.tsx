"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Doctor-side offboarding: end the care link. Takes effect immediately; the
// patient is notified in the bot and can reconnect later with the code.
export default function DoctorUnlinkPatient({
  linkId,
  patientName,
}: {
  linkId: string;
  patientName: string;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function unlink() {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/care-links/${linkId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "end" }),
    });
    setBusy(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error || "Не удалось отвязать");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  if (!confirming) {
    return (
      <button type="button" className="link-btn danger" onClick={() => setConfirming(true)}>
        Отвязать пациента
      </button>
    );
  }

  return (
    <div className="unlink-confirm">
      <span>Отвязать {patientName}? Данные перестанут поступать, пациент сможет подключиться заново.</span>
      <button className="link-btn danger" disabled={busy} onClick={unlink}>
        {busy ? "..." : "Отвязать"}
      </button>
      <button className="link-btn" onClick={() => setConfirming(false)}>
        Отмена
      </button>
      {error && <span className="error-text">{error}</span>}
    </div>
  );
}
