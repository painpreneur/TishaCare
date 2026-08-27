import { prisma } from "@tishacare/db";

export function getPatientByTelegramId(telegramId: number | string) {
  return prisma.patient.findUnique({ where: { telegramId: String(telegramId) } });
}
