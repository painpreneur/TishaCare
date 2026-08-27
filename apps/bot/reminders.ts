import cron from "node-cron";
import { Telegraf } from "telegraf";
import { prisma } from "@tishacare/db";
import { BotContext } from "./context";
import { openMiniAppKeyboard } from "./menu";

export function scheduleReminders(bot: Telegraf<BotContext>) {
  // Каждый день в 20:00 — напоминание пройти чек-ин тем, кто ещё не отметился сегодня.
  cron.schedule("0 20 * * *", async () => {
    const patients = await prisma.patient.findMany({
      where: { telegramId: { not: null } },
    });

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    for (const patient of patients) {
      const checkedInToday = await prisma.checkIn.findFirst({
        where: { patientId: patient.id, date: { gte: startOfDay } },
      });
      if (checkedInToday || !patient.telegramId) continue;

      const keyboard = openMiniAppKeyboard("/miniapp/checkin");
      const text = "Привет! Не забудьте отметить своё состояние сегодня 🙂";
      await bot.telegram
        .sendMessage(patient.telegramId, text, keyboard)
        .catch(() => {});
    }
  });
}
