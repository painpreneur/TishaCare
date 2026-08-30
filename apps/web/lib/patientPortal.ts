"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

/**
 * Which patient surface the current screen is rendered on:
 *  - "/app"     — the web portal (email/password session), or
 *  - "/miniapp" — the Telegram Mini App.
 * Shared patient components use this to build navigation targets that stay on
 * the right surface.
 */
export function usePatientBasePath(): "/app" | "/miniapp" {
  return usePathname()?.startsWith("/app") ? "/app" : "/miniapp";
}

/**
 * Href of the patient home for the current surface. Starts from the plain base
 * path so SSR and the first client render agree, then carries the `devTelegramId`
 * bypass param once `window` is readable (Mini App local testing only — never
 * present on /app or in real Telegram).
 */
export function usePatientHomeHref(): string {
  const base = usePatientBasePath();
  const [href, setHref] = useState<string>(base);
  useEffect(() => {
    const dev = new URLSearchParams(window.location.search).get("devTelegramId");
    setHref(dev ? `${base}?devTelegramId=${encodeURIComponent(dev)}` : base);
  }, [base]);
  return href;
}
