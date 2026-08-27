import "dotenv/config";
import { Telegraf } from "telegraf";
import { message } from "telegraf/filters";
import { prisma, generateInviteCode, logBotEvent, APP_ENV } from "@tishacare/db";
import { logStartEvent } from "./eventLog";
import { BotContext } from "./context";
import { getPatientByTelegramId } from "./patient";
import { openMiniAppKeyboard } from "./menu";
import { scheduleReminders } from "./reminders";

// apps/bot is the local dev loop only (long-polling). Production traffic is
// served by the webhook in apps/web — see docs/ENVIRONMENTS.md. Starting a
// poller with the prod contour's token would call deleteWebhook and silently
// steal real patient updates onto this machine, so refuse outright.
if (APP_ENV === "production") {
  throw new Error(
    "apps/bot is the local dev bot and must not run with APP_ENV=production. " +
      "Production is served by apps/web's webhook."
  );
}

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  throw new Error("TELEGRAM_BOT_TOKEN is not set. Add it to apps/bot/.env — get one from @BotFather.");
}

const bot = new Telegraf<BotContext>(token);

// Safety net: the upstream Postgres endpoint occasionally drops a pooled
// connection in the background (outside any query), which can surface as an
// unhandled error/rejection rather than a catchable query error. A crashed
// bot process stops responding entirely, which is worse than logging and
// carrying on — Telegraf's own per-update error handling covers query
// errors that happen inside a handler.
process.on("uncaughtException", (err) => {
  console.error("Uncaught exception (bot kept running):", err);
});
process.on("unhandledRejection", (err) => {
  console.error("Unhandled rejection (bot kept running):", err);
});

function miniAppReply(ctx: BotContext, text: string) {
  const keyboard = openMiniAppKeyboard();
  if (!keyboard) {
    return ctx.reply(`${text}\n\nМини-приложение временно недоступно.`);
  }
  return ctx.reply(text, keyboard);
}

async function notifyAdminOfNewPatient(ctx: BotContext, name: string, telegramId: string, username?: string) {
  const adminId = process.env.ADMIN_TELEGRAM_ID;
  if (!adminId) return;
  try {
    await ctx.telegram.sendMessage(adminId, `Новый пациент в боте: ${name} (@${username ?? "без username"}, id ${telegramId})`);
  } catch (err) {
    console.error("Failed to notify admin about new patient:", err);
  }
}

bot.start(async (ctx) => {
  const telegramId = String(ctx.from.id);
  const existing = await getPatientByTelegramId(ctx.from.id);
  const name = [ctx.from.first_name, ctx.from.last_name].filter(Boolean).join(" ") || "Пациент";

  const eventData = { telegramId, username: ctx.from.username, name };
  await Promise.all([logBotEvent(eventData), logStartEvent(eventData)]);

  // Upsert instead of create: Telegram can redeliver several queued /start
  // updates in a burst (e.g. after the bot was offline), and concurrent
  // handlers would otherwise race past the "does this patient exist" check
  // and collide on the unique telegramId constraint.
  const patient = await prisma.patient.upsert({
    where: { telegramId },
    update: {},
    create: { name, telegramId, inviteCode: generateInviteCode() },
  });

  if (existing) {
    return miniAppReply(ctx, `С возвращением, ${existing.name}! Нажмите кнопку ниже, чтобы открыть приложение.`);
  }

  await notifyAdminOfNewPatient(ctx, patient.name, telegramId, ctx.from.username);

  return miniAppReply(
    ctx,
    `Привет, ${patient.name}! Я помогу отслеживать ваше состояние между визитами к врачу.\n\n` +
      "Нажмите кнопку ниже, чтобы открыть приложение."
  );
});

bot.help((ctx) => miniAppReply(ctx, "Всё управление — через приложение. Нажмите кнопку ниже."));

bot.on(message("text"), (ctx) => miniAppReply(ctx, "Нажмите кнопку ниже, чтобы открыть приложение."));

bot.catch((err, ctx) => {
  console.error(`Telegraf error for update ${ctx.updateType}:`, err);
});

scheduleReminders(bot);

bot.launch().then(() => console.log("Bot started"));

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
