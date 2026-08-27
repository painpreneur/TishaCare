"use client";

import Link from "next/link";
import { withDevTelegramIdParam } from "@/lib/miniappClient";
import { usePatientBasePath } from "@/lib/patientPortal";

export default function BackLink() {
  const base = usePatientBasePath();
  return (
    <Link href={withDevTelegramIdParam(base)} className="back-link">
      ← Домой
    </Link>
  );
}
