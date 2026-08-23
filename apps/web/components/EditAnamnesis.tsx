"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  patientId: string;
  anamnesis: string | null;
  birthDate: string | null;
}

export default function EditAnamnesis({ patientId, anamnesis, birthDate }: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(anamnesis ?? "");
  const [date, setDate] = useState(birthDate ?? "");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    await fetch(`/api/patients/${patientId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ anamnesis: value, birthDate: date }),
    });
    setSaving(false);
    setEditing(false);
    router.refresh();
  }

  if (!editing) {
    return (
      <div>
        <p className="anamnesis">{anamnesis || "Нет данных"}</p>
        {birthDate && (
          <p className="empty" style={{ marginTop: 4 }}>
            Дата рождения: {new Date(birthDate).toLocaleDateString("ru-RU")}
          </p>
        )}
        <button className="link-btn" onClick={() => setEditing(true)} style={{ marginTop: 8 }}>
          Редактировать
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="field">
        <label>Дата рождения</label>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </div>
      <div className="field">
        <label>Анамнез</label>
        <textarea
          rows={4}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Диагноз, история наблюдения..."
        />
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <button className="btn-primary btn-inline" onClick={handleSave} disabled={saving}>
          {saving ? "Сохраняем..." : "Сохранить"}
        </button>
        <button className="link-btn" onClick={() => setEditing(false)}>
          Отмена
        </button>
      </div>
    </div>
  );
}
