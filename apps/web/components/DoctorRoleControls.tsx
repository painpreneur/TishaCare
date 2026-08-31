"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Admin-only: promote a colleague to admin or step one back to member. The
// clinic must keep at least one admin, so the last admin has no control.
export default function DoctorRoleControls({
  doctorId,
  role,
  isSelf,
  lastAdmin,
}: {
  doctorId: string;
  role: string;
  isSelf: boolean;
  lastAdmin: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (lastAdmin) {
    return <p className="empty" style={{ marginTop: 4 }}>Единственный администратор</p>;
  }

  const next = role === "admin" ? "member" : "admin";
  const label = role === "admin" ? "Убрать администратора" : "Сделать администратором";

  async function change() {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/clinic/doctors/${doctorId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: next }),
    });
    setBusy(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error || "Не удалось изменить роль");
      return;
    }
    router.refresh();
  }

  return (
    <div style={{ marginTop: 4 }}>
      <button type="button" className="link-btn" disabled={busy} onClick={change}>
        {label}
        {isSelf && role === "admin" ? " (для себя)" : ""}
      </button>
      {error && <span className="error-text" style={{ marginLeft: 8 }}>{error}</span>}
    </div>
  );
}
