"use client";

import Link from "next/link";
import { usePatientHomeHref } from "@/lib/patientPortal";

export default function BackLink() {
  const href = usePatientHomeHref();
  return (
    <Link href={href} className="back-link">
      ← Домой
    </Link>
  );
}
