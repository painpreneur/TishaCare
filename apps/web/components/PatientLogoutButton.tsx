"use client";

import { useRouter } from "next/navigation";

export default function PatientLogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/app/logout", { method: "POST" });
    router.push("/app/login");
    router.refresh();
  }

  return (
    <button className="logout-btn" onClick={handleLogout}>
      Выйти
    </button>
  );
}
