"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ENCOUNTER_TYPE_LABEL, type EncounterType } from "@/lib/encounter";

interface Planned {
  id: string;
  date: string; // ISO
  type: string;
  overdue: boolean;
}

export default function PlannedEncounters({
  patientId,
  items,
}: {
  patientId: string;
  items: Planned[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  async function act(id: string, method: "PATCH" | "DELETE") {
    setBusy(id);
    await fetch(`/api/patients/${patientId}/encounters/${id}`, { method });
    setBusy(null);
    router.refresh();
  }

  if (items.length === 0) return null;

  return (
    <ul className="encounter-list" style={{ marginTop: 12 }}>
      {items.map((e) => (
        <li key={e.id}>
          <div className="encounter-head">
            <strong>
              {ENCOUNTER_TYPE_LABEL[e.type as EncounterType] ?? e.type} ·{" "}
              {new Date(e.date).toLocaleDateString("ru-RU")}
            </strong>
            <span className={`badge ${e.overdue ? "warn" : "ok"}`}>
              {e.overdue ? "Просрочен, нужно закрыть" : "Запланирован"}
            </span>
          </div>
          <div style={{ display: "flex", gap: 12, marginTop: 4 }}>
            <button
              type="button"
              className="link-btn"
              disabled={busy === e.id}
              onClick={() => act(e.id, "PATCH")}
            >
              Отметить состоявшимся
            </button>
            <button
              type="button"
              className="link-btn danger"
              disabled={busy === e.id}
              onClick={() => act(e.id, "DELETE")}
            >
              Отменить
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
