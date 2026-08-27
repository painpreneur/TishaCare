"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePatientBasePath } from "@/lib/patientPortal";

export default function BackLink() {
  const base = usePatientBasePath();
  // Start from the plain path so SSR and the first client render agree, then
  // carry the dev-bypass query param once we can read window (Mini App local
  // testing only — never present on /app or in real Telegram).
  const [href, setHref] = useState<string>(base);
  useEffect(() => {
    const dev = new URLSearchParams(window.location.search).get("devTelegramId");
    setHref(dev ? `${base}?devTelegramId=${encodeURIComponent(dev)}` : base);
  }, [base]);

  return (
    <Link href={href} className="back-link">
      ← Домой
    </Link>
  );
}
