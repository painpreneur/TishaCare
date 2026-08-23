"use client";

/**
 * Builds the auth header for a request to /api/miniapp/*, from either the
 * real Telegram WebApp initData or (non-production only, mirrored by the
 * server-side check in lib/telegramAuth.ts) a `?devTelegramId=` query param
 * for testing outside of Telegram.
 */
export function miniAppAuthHeaders(): Record<string, string> {
  if (typeof window === "undefined") return {};

  const initData = window.Telegram?.WebApp?.initData;
  if (initData) {
    return { "X-Telegram-Init-Data": initData };
  }

  const devTelegramId = new URLSearchParams(window.location.search).get("devTelegramId");
  if (devTelegramId) {
    return { "X-Dev-Telegram-Id": devTelegramId };
  }

  return {};
}

export function withDevTelegramIdParam(path: string): string {
  if (typeof window === "undefined") return path;
  const devTelegramId = new URLSearchParams(window.location.search).get("devTelegramId");
  if (!devTelegramId) return path;
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}devTelegramId=${encodeURIComponent(devTelegramId)}`;
}
