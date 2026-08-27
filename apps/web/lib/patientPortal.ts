"use client";

import { usePathname } from "next/navigation";

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
