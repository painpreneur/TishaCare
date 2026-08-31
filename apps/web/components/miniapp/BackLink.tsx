"use client";

import Link from "next/link";
import { usePatientHomeHref } from "@/lib/patientPortal";

// "Домой" is pinned to the lower-right of the screen (fixed), where a right
// thumb reaches on a one-handed grip — not the top-left corner. `.miniapp-page`
// carries the bottom padding that keeps content clear of it. Screens still
// render <BackLink /> wherever; position comes from CSS.
export default function BackLink() {
  const href = usePatientHomeHref();
  return (
    <Link href={href} className="patient-home-btn" aria-label="На главный экран">
      <span aria-hidden="true">⌂</span>
      Домой
    </Link>
  );
}
