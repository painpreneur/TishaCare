import type { Telegram } from "telegraf";
import { prisma } from "@tishacare/db";
import { openMiniAppKeyboard } from "./menu";

// Silence-gap threshold: a patient who has checked in before but not in this
// many days is "lapsed" and gets the gentle re-engagement message instead of
// the daily "not checked in today" nudge.
export const REENGAGE_GAP_DAYS = 3;
// Never send the re-engagement message more often than this.
export const REENGAGE_THROTTLE_DAYS = 3;

/**
 * One warm, low-pressure nudge for patients who have gone quiet for a while.
 * Shared by the Vercel Cron route (apps/web) and the local scheduler (apps/bot).
 * Опт-аут через `checkinReminderEnabled`; троттлинг через `reengagedAt`.
 */
export async function sendDueReengagement(telegram: Telegram): Promise<number> {
  const now = Date.now();
  const gapBefore = new Date(now - REENGAGE_GAP_DAYS * 24 * 60 * 60 * 1000);
  const throttleBefore = new Date(now - REENGAGE_THROTTLE_DAYS * 24 * 60 * 60 * 1000);

  const patients = await prisma.patient.findMany({
    where: {
      telegramId: { not: null },
      consentAt: { not: null },
      checkinReminderEnabled: true,
      OR: [{ reengagedAt: null }, { reengagedAt: { lt: throttleBefore } }],
    },
    include: { checkIns: { orderBy: { date: "desc" }, take: 1 } },
  });

  const keyboard = openMiniAppKeyboard("/miniapp/checkin");
  const text =
    "Давно тебя не было. Навёрстывать ничего не нужно: одна короткая отметка о том, " +
    "как ты сейчас, и этого достаточно.";

  let sent = 0;
  for (const patient of patients) {
    if (!patient.telegramId) continue;
    const last = patient.checkIns[0];
    // Only lapsed patients: they have checked in before, but not recently.
    if (!last || last.date >= gapBefore) continue;

    try {
      await telegram.sendMessage(patient.telegramId, text, keyboard);
      await prisma.patient.update({
        where: { id: patient.id },
        data: { reengagedAt: new Date() },
      });
      sent++;
    } catch {
      // one blocked recipient must not stop the run; leave reengagedAt so a
      // later run retries.
    }
  }

  return sent;
}
