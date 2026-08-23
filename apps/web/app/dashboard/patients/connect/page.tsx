"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function ConnectPatientPage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/patients/connect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Не удалось подключить пациента");
      return;
    }

    router.push(`/dashboard/patients/${data.patientId}`);
    router.refresh();
  }

  return (
    <div className="page">
      <Link href="/dashboard" className="back-link">
        ← Все пациенты
      </Link>
      <h2>Подключить пациента</h2>

      <form onSubmit={handleSubmit} className="panel" style={{ maxWidth: 420 }}>
        <div className="field">
          <label>Код пациента</label>
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Например, WB1Y4L"
            required
          />
        </div>
        {error && <p className="error-text">{error}</p>}
        <button className="btn-primary" type="submit" disabled={loading}>
          {loading ? "Подключаем..." : "Подключить"}
        </button>
      </form>

      <p className="hint">
        Пациент получает этот код в Telegram-боте (@MindSteady_bot) при первом запуске и должен
        передать его вам.
      </p>
    </div>
  );
}
