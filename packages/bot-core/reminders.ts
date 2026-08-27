import type { Telegram } from "telegraf";
import { prisma } from "@tishacare/db";
import { openMiniAppKeyboard } from "./menu";

/**
 * Sends a check-in nudge to every linked patient who has not checked in yet
 * today, and returns how many messages were sent. Shared by the Vercel Cron
 * route (apps/web) and the local node-cron scheduler (apps/bot).
 *
 * `telegram` is a Telegraf `bot.telegram` client. Send failures (e.g. the user
 * blocked the bot) are swallowed per-patient so one bad recipient doesn't stop
 * the run.
 */
export async function sendDueCheckinReminders(telegram: Telegram): Promise<number> {
  const patients = await prisma.patient.findMany({
    where: { telegramId: { not: null } },
  });

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const keyboard = openMiniAppKeyboard("/miniapp/checkin");
  const text = "Привет! Не забудьте отметить своё состояние сегодня 🙂";

  let sent = 0;
  for (const patient of patients) {
    if (!patient.telegramId) continue;

    const checkedInToday = await prisma.checkIn.findFirst({
      where: { patientId: patient.id, date: { gte: startOfDay } },
    });
    if (checkedInToday) continue;

    await telegram.sendMessage(patient.telegramId, text, keyboard).catch(() => {});
    sent++;
  }

  return sent;
}
