"use client";

import Link from "next/link";
import { withDevTelegramIdParam } from "@/lib/miniappClient";

export default function BackLink() {
  return (
    <Link href={withDevTelegramIdParam("/miniapp")} className="back-link">
      ← Домой
    </Link>
  );
}
