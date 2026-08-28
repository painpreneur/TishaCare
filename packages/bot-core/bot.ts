import { Telegraf, Context, Markup } from "telegraf";
import { message } from "telegraf/filters";
import { prisma, generateInviteCode, logBotEvent } from "@tishacare/db";
import { openMiniAppKeyboard } from "./menu";

// One-tap mood buttons for /checkin. A tap stores a minimal "moment" check-in
// (mood only); state tags, energy and a note are added in the Mini App.
const MOOD_BUTTONS: [string, number][] = [
  ["😞", -2],
  ["🙁", -1],
  ["😐", 0],
  ["🙂", 1],
  ["😄", 2],
];

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

  bot.command("checkin", async (ctx) => {
    const telegramId = String(ctx.from.id);
    const patient = await prisma.patient.findUnique({ where: { telegramId } });
    if (!patient) {
      return miniAppReply(ctx, "Сначала нажмите /start, чтобы начать.");
    }
    if (!patient.consentAt) {
      return miniAppReply(
        ctx,
        "Откройте приложение и подтвердите согласие на обработку данных, потом можно будет отмечаться командой."
      );
    }
    return ctx.reply(
      "Как настроение сейчас?",
      Markup.inlineKeyboard([MOOD_BUTTONS.map(([e, v]) => Markup.button.callback(e, `ci:${v}`))])
    );
  });

  bot.action(/^ci:(-?[0-2])$/, async (ctx) => {
    const mood = Number(ctx.match[1]);
    const telegramId = String(ctx.from.id);
    const patient = await prisma.patient.findUnique({ where: { telegramId } });
    if (!patient || !patient.consentAt) {
      await ctx.answerCbQuery();
      return ctx.editMessageText("Откройте приложение, чтобы отметиться.");
    }
    await prisma.checkIn.create({ data: { patientId: patient.id, mood } });
    await ctx.answerCbQuery("Записал");
    const emoji = MOOD_BUTTONS.find(([, v]) => v === mood)?.[0] ?? "";
    const keyboard = openMiniAppKeyboard("/miniapp/checkin");
    return ctx.editMessageText(
      `Записал: ${emoji}. Детали и заметку можно добавить в приложении.`,
      keyboard
    );
  });

  bot.help((ctx) => miniAppReply(ctx, "Всё управление через приложение. Нажмите кнопку ниже."));
  bot.on(message("text"), (ctx) => miniAppReply(ctx, "Нажмите кнопку ниже, чтобы открыть приложение."));
  bot.catch((err, ctx) => {
    console.error(`Telegraf error for update ${ctx.updateType}:`, err);
  });

  // Show /checkin in the bot's command menu. Idempotent; fire-and-forget so it
  // doesn't block webhook cold starts.
  bot.telegram
    .setMyCommands([{ command: "checkin", description: "Быстро отметить настроение" }])
    .catch((err) => console.error("setMyCommands failed:", err));

  return bot;
}
