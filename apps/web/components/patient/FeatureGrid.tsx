"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePatientBasePath } from "@/lib/patientPortal";
import type { PatientFeature } from "./patientFeature";

// Grid of navigation cards, surface-aware (links stay on /miniapp or /app).
// Shared by PatientHome and the /tests screen. The `?devTelegramId=` dev-only
// param is appended after mount so server and client markup match (SSR has no
// window; production Mini App never carries the param).
export default function FeatureGrid({
  features,
  cardClassName = "",
}: {
  features: PatientFeature[];
  cardClassName?: string;
}) {
  const base = usePatientBasePath();
  const [suffix, setSuffix] = useState("");

  useEffect(() => {
    try {
      const dev = new URLSearchParams(window.location.search).get("devTelegramId");
      if (dev) setSuffix(`?devTelegramId=${encodeURIComponent(dev)}`);
    } catch {
      // no query string / not in a browser — leave links bare
    }
  }, []);

  return (
    <div className="miniapp-menu-grid">
      {features.map((f) => (
        <Link
          key={f.href}
          href={`${base}${f.href}${suffix}`}
          className={`miniapp-menu-card ${cardClassName}`.trim()}
        >
          <span className="miniapp-menu-emoji">{f.emoji}</span>
          <span className="miniapp-menu-title">{f.title}</span>
          <span className="miniapp-menu-desc">{f.desc}</span>
        </Link>
      ))}
    </div>
  );
}
