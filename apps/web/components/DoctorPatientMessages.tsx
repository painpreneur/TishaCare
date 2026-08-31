"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DOCTOR_NOTE_MAX } from "@/lib/doctorNoteShared";

interface Note {
  id: string;
  body: string;
  doctorName: string;
  createdAt: string;
  readAt: string | null;
}

const fmt = (iso: string) =>
  new Date(iso).toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

// Doctor side of the one-way note channel: a compose box and the sent history
// with read status. Not a chat — the patient can only mark a note read.
export default function DoctorPatientMessages({
  patientId,
  canSend,
  notes,
}: {
  patientId: string;
  canSend: boolean;
  notes: Note[];
}) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send() {
    const text = body.trim();
    if (!text) return;
    setSending(true);
    setError(null);
    const res = await fetch(`/api/patients/${patientId}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: text }),
    });
    setSending(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error || "Не удалось отправить");
      return;
    }
    setBody("");
    router.refresh();
  }

  return (
    <div>
      {canSend ? (
        <>
          <textarea
            rows={3}
            maxLength={DOCTOR_NOTE_MAX}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Короткое сообщение пациенту, до 500 символов. Ответить он не сможет."
          />
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 6 }}>
            <button
              className="btn-primary btn-inline"
              onClick={send}
              disabled={sending || !body.trim()}
            >
              {sending ? "Отправляем..." : "Отправить"}
            </button>
            <span className="empty">
              {body.length}/{DOCTOR_NOTE_MAX}
            </span>
          </div>
          {error && <p className="error-text">{error}</p>}
        </>
      ) : (
        <p className="hint">Отправка недоступна: лицензия клиники неактивна.</p>
      )}

      {notes.length > 0 && (
        <ul className="encounter-list">
          {notes.map((n) => (
            <li key={n.id}>
              <div className="encounter-head">
                <span className="thought-date">{fmt(n.createdAt)} · {n.doctorName}</span>
                <span className={`badge ${n.readAt ? "ok" : "warn"}`}>
                  {n.readAt ? `прочитано ${fmt(n.readAt)}` : "не прочитано"}
                </span>
              </div>
              <p className="encounter-field">{n.body}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
