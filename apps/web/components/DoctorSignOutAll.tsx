"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DoctorSignOutAll() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function run() {
    if (!window.confirm("Выйти на всех устройствах? Текущая сессия тоже завершится.")) return;
    setBusy(true);
    await fetch("/api/doctor/sign-out-all", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <button type="button" className="link-btn danger" disabled={busy} onClick={run}>
      Выйти со всех устройств
    </button>
  );
}
