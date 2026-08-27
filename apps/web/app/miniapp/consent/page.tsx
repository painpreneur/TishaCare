"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { miniAppAuthHeaders, withDevTelegramIdParam } from "@/lib/miniappClient";
import { CONSENT_TEXT, CONSENT_VERSION } from "@/lib/consent";

export default function ConsentPage() {
  const router = useRouter();
  const [agreed, setAgreed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function accept() {
    setSaving(true);
    setError(null);
    const res = await fetch("/api/miniapp/consent", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...miniAppAuthHeaders() },
    });
    setSaving(false);
    if (!res.ok) {
      setError("Не удалось сохранить согласие. Попробуйте ещё раз.");
      return;
    }
    router.replace(withDevTelegramIdParam("/miniapp"));
  }

  return (
    <div className="miniapp-card">
      <h1>Согласие на обработку данных</h1>
      <p className="hint">Прежде чем начать, пожалуйста, прочитайте.</p>

      <div style={{ display: "flex", flexDirection: "column", gap: 14, margin: "16px 0" }}>
        {CONSENT_TEXT.map((section) => (
          <div key={section.heading}>
            <strong>{section.heading}</strong>
            <p style={{ margin: "4px 0 0" }}>{section.body}</p>
          </div>
        ))}
      </div>

      <label style={{ display: "flex", gap: 10, alignItems: "flex-start", cursor: "pointer" }}>
        <input
          type="checkbox"
          checked={agreed}
          onChange={(e) => setAgreed(e.target.checked)}
          style={{ marginTop: 3 }}
        />
        <span>Я прочитал(а) и даю согласие на обработку моих данных на этих условиях.</span>
      </label>

      {error && <p className="error-text">{error}</p>}

      <button
        className="btn-primary btn-inline"
        onClick={accept}
        disabled={!agreed || saving}
        style={{ marginTop: 16 }}
      >
        {saving ? "Сохраняем..." : "Продолжить"}
      </button>

      <p className="hint" style={{ marginTop: 12 }}>Версия от {CONSENT_VERSION}</p>
    </div>
  );
}
