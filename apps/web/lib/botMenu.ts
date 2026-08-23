import { Markup } from "telegraf";

export function openMiniAppKeyboard(path = "/miniapp") {
  const webAppUrl = process.env.WEBAPP_URL;
  if (!webAppUrl) return undefined;
  return Markup.inlineKeyboard([Markup.button.webApp("Открыть миниапп", `${webAppUrl}${path}`)]);
}
