import type { Telegram } from "telegraf";
import { prisma } from "@tishacare/db";
import { openMiniAppKeyboard } from "./menu";
import { REENGAGE_GAP_DAYS } from "./reengagement";

/**
 * Sends the daily "not checked in yet today" nudge. Only to patients who are
 * still active (a check-in within the last REENGAGE_GAP_DAYS days, or none ever)
 * and have not opted out — lapsed patients get sendDueReengagement instead.
 * Shared by the Vercel Cron route (apps/web) and the local scheduler (apps/bot).
 *
 * Send failures (e.g. the user blocked the bot) are swallowed per-patient.
 */
export async function sendDueCheckinReminders(telegram: Telegram): Promise<number> {
  const patients = await prisma.patient.findMany({
    where: { telegramId: { not: null }, checkinReminderEnabled: true },
    include: { checkIns: { orderBy: { date: "desc" }, take: 1 } },
  });

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const gapBefore = new Date(Date.now() - REENGAGE_GAP_DAYS * 24 * 60 * 60 * 1000);

  const keyboard = openMiniAppKeyboard("/miniapp/checkin");
  const text = "Привет! Не забудьте отметить своё состояние сегодня 🙂";

  let sent = 0;
  for (const patient of patients) {
    if (!patient.telegramId) continue;

    const last = patient.checkIns[0];
    if (last && last.date >= startOfDay) continue; // already checked in today
    if (last && last.date < gapBefore) continue; // lapsed — handled by re-engagement

    await telegram.sendMessage(patient.telegramId, text, keyboard).catch(() => {});
    sent++;
  }

  return sent;
}
