"use client";

import { useEffect, useState } from "react";
import { miniAppAuthHeaders } from "@/lib/miniappClient";

interface Note {
  id: string;
  body: string;
  doctorName: string;
  createdAt: string;
  read: boolean;
}

const fmt = (iso: string) =>
  new Date(iso).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" });

// Unread doctor messages, shown as a block on the patient home. One-way: the
// only action is "Прочитано". Read notes drop out of the block.
export default function DoctorMessages() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/miniapp/doctor-notes", { headers: miniAppAuthHeaders() })
      .then((r) => r.json())
      .then((d) => {
        if (active) setNotes((d.notes ?? []).filter((n: Note) => !n.read));
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  async function markRead(id: string) {
    setBusy(id);
    await fetch(`/api/miniapp/doctor-notes/${id}/read`, {
      method: "POST",
      headers: miniAppAuthHeaders(),
    }).catch(() => {});
    setBusy(null);
    setNotes((cur) => cur.filter((n) => n.id !== id));
  }

  if (notes.length === 0) return null;

  return (
    <div className="doctor-messages">
      <h3>Сообщение от врача</h3>
      {notes.map((n) => (
        <div key={n.id} className="doctor-message">
          <p className="doctor-message-body">{n.body}</p>
          <div className="doctor-message-foot">
            <span>{n.doctorName} · {fmt(n.createdAt)}</span>
            <button
              type="button"
              className="link-btn"
              disabled={busy === n.id}
              onClick={() => markRead(n.id)}
            >
              Прочитано
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
