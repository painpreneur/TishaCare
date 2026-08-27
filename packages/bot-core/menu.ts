import { Markup } from "telegraf";

/**
 * Inline keyboard with a single "open the Mini App" button, deep-linked to
 * `path` inside the web app. Returns undefined when WEBAPP_URL is unset so
 * callers can degrade to a plain text reply.
 */
export function openMiniAppKeyboard(path = "/miniapp") {
  const webAppUrl = process.env.WEBAPP_URL;
  if (!webAppUrl) return undefined;
  return Markup.inlineKeyboard([Markup.button.webApp("Открыть миниапп", `${webAppUrl}${path}`)]);
}
