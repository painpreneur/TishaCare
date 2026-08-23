import { Telegraf, Context } from "telegraf";
import { message } from "telegraf/filters";
import { prisma, generateInviteCode, logBotEvent } from "@mindsteady/db";
import { openMiniAppKeyboard } from "./botMenu";

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  throw new Error("TELEGRAM_BOT_TOKEN is not set.");
}

function miniAppReply(ctx: Context, text: string) {
  const keyboard = openMiniAppKeyboard();
  if (!keyboard) {
    return ctx.reply(`${text}\n\nМини-приложение временно недоступно.`);
  }
  return ctx.reply(text, keyboard);
}

function createBot() {
  const instance = new Telegraf(token!);

  instance.start(async (ctx) => {
    const telegramId = String(ctx.from.id);
    const existing = await prisma.patient.findUnique({ where: { telegramId } });
    const name = [ctx.from.first_name, ctx.from.last_name].filter(Boolean).join(" ") || "Пациент";

    await logBotEvent({ telegramId, username: ctx.from.username, name });

    // Upsert instead of create: Telegram can redeliver several queued /start
    // updates in a burst (e.g. after the webhook was briefly down), and
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

    return miniAppReply(
      ctx,
      `Привет, ${patient.name}! Я помогу отслеживать ваше состояние между визитами к врачу.\n\n` +
        "Нажмите кнопку ниже, чтобы открыть приложение."
    );
  });

  instance.help((ctx) => miniAppReply(ctx, "Всё управление — через приложение. Нажмите кнопку ниже."));
  instance.on(message("text"), (ctx) => miniAppReply(ctx, "Нажмите кнопку ниже, чтобы открыть приложение."));
  instance.catch((err, ctx) => {
    console.error(`Telegraf error for update ${ctx.updateType}:`, err);
  });

  return instance;
}

// Next.js dev-mode hot reload re-evaluates this module on every edit; without
// caching on globalThis each reload would register a second copy of every
// handler on the same long-lived process, so /start would reply twice, three
// times, etc.
const globalForBot = globalThis as unknown as { bot?: Telegraf };

export const bot = globalForBot.bot ?? createBot();

if (process.env.NODE_ENV !== "production") {
  globalForBot.bot = bot;
}
