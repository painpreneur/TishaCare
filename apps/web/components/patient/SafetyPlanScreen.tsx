"use client";

import { useEffect, useState } from "react";
import { miniAppAuthHeaders } from "@/lib/miniappClient";
import BackLink from "@/components/miniapp/BackLink";
import {
  SAFETY_PLAN_FIELDS,
  SAFETY_PLAN_FIELD_LABEL,
  SAFETY_PLAN_FIELD_HINT,
  SAFETY_FIELD_MAX,
  SAFETY_EMERGENCY_CONTACTS,
  isSafetyPlanEmpty,
  type SafetyPlanDto,
  type SafetyPlanField,
} from "@/lib/safetyPlan";

// The patient's plan for a hard moment. Filled in calm times, easy to return
// to later. No scoring, no gamification — just their own words plus the fixed
// emergency numbers.
export default function SafetyPlanScreen() {
  const [plan, setPlan] = useState<SafetyPlanDto | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Record<SafetyPlanField, string>>({
    warningSigns: "",
    copingSteps: "",
    contacts: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/miniapp/safety-plan", { headers: miniAppAuthHeaders() })
      .then((r) => r.json())
      .then((d: SafetyPlanDto) => {
        setPlan(d);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  function startEdit() {
    setDraft({
      warningSigns: plan?.warningSigns ?? "",
      copingSteps: plan?.copingSteps ?? "",
      contacts: plan?.contacts ?? "",
    });
    setEditing(true);
  }

  async function save() {
    setSaving(true);
    const res = await fetch("/api/miniapp/safety-plan", {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...miniAppAuthHeaders() },
      body: JSON.stringify(draft),
    });
    setSaving(false);
    if (res.ok) {
      setPlan(await res.json());
      setEditing(false);
    }
  }

  const emergencyBlock = (
    <div className="miniapp-card safety-emergency">
      <h2>Срочная помощь</h2>
      <ul className="safety-contacts">
        {SAFETY_EMERGENCY_CONTACTS.map((c) => (
          <li key={c.value}>
            <span>{c.label}</span>
            <strong>{c.value}</strong>
          </li>
        ))}
      </ul>
      <p className="hint">Если есть мысли о том, чтобы причинить себе вред, позвоните прямо сейчас.</p>
    </div>
  );

  if (!loaded) {
    return (
      <div>
        <BackLink />
        <div className="miniapp-card"><p className="empty">Загрузка...</p></div>
      </div>
    );
  }

  if (editing) {
    return (
      <div>
        <BackLink />
        <div className="miniapp-card">
          <h1>План на трудный момент</h1>
          {SAFETY_PLAN_FIELDS.map((f) => (
            <div className="field" key={f}>
              <label>{SAFETY_PLAN_FIELD_LABEL[f]}</label>
              <p className="hint" style={{ marginTop: 0 }}>{SAFETY_PLAN_FIELD_HINT[f]}</p>
              <textarea
                rows={4}
                maxLength={SAFETY_FIELD_MAX}
                value={draft[f]}
                onChange={(e) => setDraft((d) => ({ ...d, [f]: e.target.value }))}
              />
            </div>
          ))}
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn-primary btn-inline" onClick={save} disabled={saving}>
              {saving ? "Сохраняем..." : "Сохранить"}
            </button>
            <button className="link-btn" onClick={() => setEditing(false)} disabled={saving}>
              Отмена
            </button>
          </div>
        </div>
        {emergencyBlock}
      </div>
    );
  }

  if (isSafetyPlanEmpty(plan)) {
    return (
      <div>
        <BackLink />
        <div className="miniapp-card">
          <h1>План на трудный момент</h1>
          <p className="hint">
            Заполните его сейчас, в спокойное время. Потом, когда будет тяжело, к нему легко
            вернуться: свои признаки спада, что помогает, кому написать.
          </p>
          <button className="btn-primary btn-inline" onClick={startEdit}>
            Заполнить план
          </button>
        </div>
        {emergencyBlock}
      </div>
    );
  }

  return (
    <div>
      <BackLink />
      <div className="miniapp-card">
        <h1>План на трудный момент</h1>
        {SAFETY_PLAN_FIELDS.map((f) =>
          plan?.[f] ? (
            <div className="safety-section" key={f}>
              <h3>{SAFETY_PLAN_FIELD_LABEL[f]}</h3>
              <p className="safety-text">{plan[f]}</p>
            </div>
          ) : null,
        )}
        <button className="link-btn" onClick={startEdit} style={{ marginTop: 8 }}>
          Изменить
        </button>
      </div>
      {emergencyBlock}
    </div>
  );
}
