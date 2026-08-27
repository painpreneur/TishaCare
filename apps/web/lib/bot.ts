import { Telegraf, Context } from "telegraf";
import { message } from "telegraf/filters";
import { prisma, generateInviteCode, logBotEvent } from "@tishacare/db";
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

// Awaited (not fire-and-forget) on purpose: on Vercel, once the webhook
// route's handler promise resolves and the HTTP response is sent, the
// serverless function can be frozen/torn down — an un-awaited sendMessage
// here would race that teardown and could get silently dropped mid-flight.
async function notifyAdminOfNewPatient(ctx: Context, name: string, telegramId: string, username?: string) {
  const adminId = process.env.ADMIN_TELEGRAM_ID;
  if (!adminId) return;
  try {
    await ctx.telegram.sendMessage(adminId, `Новый пациент в боте: ${name} (@${username ?? "без username"}, id ${telegramId})`);
  } catch (err) {
    console.error("Failed to notify admin about new patient:", err);
  }
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

    await notifyAdminOfNewPatient(ctx, patient.name, telegramId, ctx.from.username);

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
