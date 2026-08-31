import type { Telegram } from "telegraf";
import { prisma } from "@tishacare/db";

const ENCOUNTER_TYPE_LABEL: Record<string, string> = {
  visit: "приём",
  consult: "консультация",
  phone: "звонок",
  note: "встреча",
};

/**
 * One-day-ahead nudge for planned appointments. Sends to every patient with a
 * `planned` Encounter happening today or tomorrow that has not been reminded
 * yet, then stamps `reminderSentAt` so the daily cron never repeats it.
 * Shared by the Vercel Cron route (apps/web) and the local scheduler (apps/bot).
 */
export async function sendDueEncounterReminders(telegram: Telegram): Promise<number> {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const endOfTomorrow = new Date(startOfToday.getTime() + 2 * 24 * 60 * 60 * 1000);

  const due = await prisma.encounter.findMany({
    where: {
      status: "planned",
      reminderSentAt: null,
      date: { gte: startOfToday, lt: endOfTomorrow },
      patient: { telegramId: { not: null } },
    },
    include: {
      patient: { select: { telegramId: true } },
      doctor: { select: { name: true } },
    },
  });

  let sent = 0;
  for (const enc of due) {
    if (!enc.patient.telegramId) continue;
    const when = enc.date.toLocaleDateString("ru-RU", { day: "2-digit", month: "long" });
    const kind = ENCOUNTER_TYPE_LABEL[enc.type] ?? "приём";
    const text = `Напоминание: ${when} у вас ${kind} — ${enc.doctor.name}.`;
    try {
      await telegram.sendMessage(enc.patient.telegramId, text);
      await prisma.encounter.update({
        where: { id: enc.id },
        data: { reminderSentAt: new Date() },
      });
      sent++;
    } catch {
      // one blocked recipient must not stop the run; leave reminderSentAt null
      // so a later run can retry.
    }
  }

  return sent;
}
