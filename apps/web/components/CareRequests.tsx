"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Request {
  id: string;
  patientName: string;
}

export default function CareRequests({ requests }: { requests: Request[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  async function act(id: string, action: "accept" | "decline") {
    setBusy(id);
    await fetch(`/api/care-links/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    setBusy(null);
    router.refresh();
  }

  return (
    <div className="panel">
      <h3>Запросы на подключение</h3>
      <ul className="thought-list">
        {requests.map((r) => (
          <li key={r.id} style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ flex: 1 }}>{r.patientName} хочет подключиться к вам</span>
            <button
              className="btn-primary btn-inline"
              disabled={busy === r.id}
              onClick={() => act(r.id, "accept")}
            >
              Принять
            </button>
            <button className="link-btn" disabled={busy === r.id} onClick={() => act(r.id, "decline")}>
              Отклонить
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
