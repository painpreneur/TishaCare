import { Telegraf, Markup } from "telegraf";
import type { Telegram } from "telegraf";
import { prisma } from "@tishacare/db";
import { openMiniAppKeyboard } from "./menu";

// Opt-in daily "did you take your meds?" nudge. Delivered alongside the evening
// check-in reminder (Vercel Hobby crons run once a day). A tap starts a tiny
// check-in: medication status, then mood — written as one CheckIn row, so it
// feeds the adherence↔wellbeing view the doctor sees.

const MOOD: [string, number][] = [
  ["😞", -2],
  ["🙁", -1],
  ["😐", 0],
  ["🙂", 1],
  ["😄", 2],
];
const MOOD_EMOJI = new Map(MOOD.map(([e, v]) => [v, e]));

const MEDS: Record<string, { label: string; done: string }> = {
  y: { label: "Приняты", done: "приняты" },
  p: { label: "Частично", done: "частично" },
  n: { label: "Не приняты", done: "не приняты" },
};
const MEDS_DB: Record<string, "yes" | "partial" | "no"> = { y: "yes", p: "partial", n: "no" };

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Sends the med-intake nudge to every opted-in, Telegram-linked patient who has
 * at least one active medication and hasn't already logged a medsStatus today.
 * Returns how many were sent. Per-recipient failures are swallowed.
 */
export async function sendDueMedReminders(telegram: Telegram): Promise<number> {
  const patients = await prisma.patient.findMany({
    where: { medReminderEnabled: true, telegramId: { not: null } },
    select: {
      id: true,
      telegramId: true,
      medications: {
        where: { status: "active" },
        select: { name: true, dosage: true },
        orderBy: { startedAt: "asc" },
      },
    },
  });

  const since = startOfToday();
  let sent = 0;

  for (const p of patients) {
    if (!p.telegramId || p.medications.length === 0) continue;

    const already = await prisma.checkIn.findFirst({
      where: { patientId: p.id, date: { gte: since }, medsStatus: { not: null } },
      select: { id: true },
    });
    if (already) continue;

    const list = p.medications.map((m) => `• ${m.name}, ${m.dosage}`).join("\n");
    const text = `Пора отметить приём препаратов 💊\n${list}\n\nПриняли сегодня?`;
    const keyboard = Markup.inlineKeyboard([
      [
        Markup.button.callback("Приняты", "mr:s:y"),
        Markup.button.callback("Частично", "mr:s:p"),
        Markup.button.callback("Не приняты", "mr:s:n"),
      ],
    ]);

    await telegram.sendMessage(p.telegramId, text, keyboard).catch(() => {});
    sent++;
  }

  return sent;
}

export function registerMedReminders(bot: Telegraf) {
  // status picked → ask mood
  bot.action(/^mr:s:([ypn])$/, async (ctx) => {
    await ctx.answerCbQuery();
    const s = ctx.match[1];
    return ctx.editMessageText(
      `Препараты: ${MEDS[s].done}. Как настроение сейчас?`,
      Markup.inlineKeyboard([MOOD.map(([e, v]) => Markup.button.callback(e, `mr:m:${s}:${v}`))]),
    );
  });

  // mood picked → write the check-in
  bot.action(/^mr:m:([ypn]):(-?[0-2])$/, async (ctx) => {
    await ctx.answerCbQuery();
    const s = ctx.match[1];
    const mood = Number(ctx.match[2]);

    const telegramId = String(ctx.from.id);
    const patient = await prisma.patient.findUnique({ where: { telegramId } });
    if (!patient || !patient.consentAt) {
      return ctx.editMessageText("Откройте приложение, чтобы отметиться.");
    }

    await prisma.checkIn.create({
      data: { patientId: patient.id, mood, medsStatus: MEDS_DB[s] },
    });

    const open = openMiniAppKeyboard("/miniapp/progress");
    return ctx.editMessageText(
      `Записал: ${MOOD_EMOJI.get(mood) ?? ""} · препараты ${MEDS[s].done}.`,
      open,
    );
  });
}
