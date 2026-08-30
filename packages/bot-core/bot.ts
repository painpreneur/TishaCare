import { Telegraf, Context } from "telegraf";
import { message } from "telegraf/filters";
import { prisma, generateInviteCode, logBotEvent } from "@tishacare/db";
import { openMiniAppKeyboard } from "./menu";
import { registerCheckinWizard } from "./checkin";
import { registerMedReminders } from "./medReminders";

// Single source of truth for the bot's behaviour. Both entry points wrap this:
// apps/web/lib/bot.ts (webhook, production) and apps/bot/index.ts (long-polling,
// local dev). Keep all handler logic here so a fix lands in both environments.

function miniAppReply(ctx: Context, text: string) {
  const keyboard = openMiniAppKeyboard();
  if (!keyboard) {
    return ctx.reply(`${text}\n\nМини-приложение временно недоступно.`);
  }
  return ctx.reply(text, keyboard);
}

// Awaited (not fire-and-forget) on purpose: on Vercel, once the webhook route's
// handler promise resolves and the HTTP response is sent, the serverless
// function can be frozen/torn down — an un-awaited sendMessage here would race
// that teardown and could get silently dropped mid-flight.
async function notifyAdminOfNewPatient(ctx: Context, name: string, telegramId: string, username?: string) {
  const adminId = process.env.ADMIN_TELEGRAM_ID;
  if (!adminId) return;
  try {
    await ctx.telegram.sendMessage(adminId, `Новый пациент в боте: ${name} (@${username ?? "без username"}, id ${telegramId})`);
  } catch (err) {
    console.error("Failed to notify admin about new patient:", err);
  }
}

/**
 * Builds a fully-wired Telegraf instance. Reads TELEGRAM_BOT_TOKEN from the
 * environment and throws if it is missing. The caller decides how to run it
 * (`bot.launch()` for polling, `bot.handleUpdate()` for a webhook).
 */
export function createBot(): Telegraf {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    throw new Error("TELEGRAM_BOT_TOKEN is not set.");
  }

  const bot = new Telegraf(token);

  bot.start(async (ctx) => {
    const telegramId = String(ctx.from.id);
    const existing = await prisma.patient.findUnique({ where: { telegramId } });
    const name = [ctx.from.first_name, ctx.from.last_name].filter(Boolean).join(" ") || "Пациент";

    await logBotEvent({ telegramId, username: ctx.from.username, name });

    // Upsert instead of create: Telegram can redeliver several queued /start
    // updates in a burst (e.g. after the bot was briefly offline), and
    // concurrent handlers would otherwise race past the "does this patient
    // exist" check and collide on the unique telegramId constraint.
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

  // /checkin and its whole inline-keyboard flow (moment + day). Registered
  // before the text catch-all below so the note force-reply is seen first.
  registerCheckinWizard(bot);

  // Inline-button handlers for the opt-in med-intake nudge (mr:*).
  registerMedReminders(bot);

  bot.help((ctx) => miniAppReply(ctx, "Всё управление через приложение. Нажмите кнопку ниже."));
  bot.on(message("text"), (ctx) => miniAppReply(ctx, "Нажмите кнопку ниже, чтобы открыть приложение."));
  bot.catch((err, ctx) => {
    console.error(`Telegraf error for update ${ctx.updateType}:`, err);
  });

  // Show /checkin in the bot's command menu. Idempotent; fire-and-forget so it
  // doesn't block webhook cold starts.
  bot.telegram
    .setMyCommands([{ command: "checkin", description: "Отметить состояние" }])
    .catch((err) => console.error("setMyCommands failed:", err));

  return bot;
}
