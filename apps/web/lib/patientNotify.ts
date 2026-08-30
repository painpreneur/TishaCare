import { prisma } from "@tishacare/db";

// Best-effort Telegram nudge to a patient. No-ops without a bot token or a
// Telegram-linked patient. The bot module is imported lazily so a missing
// token can't break the route that calls this. Failures are swallowed — a
// dropped notification must never fail the write it accompanies.
export async function notifyPatientTelegram(patientId: string, text: string): Promise<void> {
  if (!process.env.TELEGRAM_BOT_TOKEN) return;
  try {
    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
      select: { telegramId: true },
    });
    if (!patient?.telegramId) return;
    const { bot } = await import("./bot");
    await bot.telegram.sendMessage(patient.telegramId, text);
  } catch (e) {
    console.error("patient Telegram notification failed:", e);
  }
}
