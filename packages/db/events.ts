import { prisma } from "./index";

export async function logBotEvent(params: {
  telegramId: string;
  username?: string;
  name?: string;
  type?: string;
}) {
  return prisma.botEvent.create({
    data: {
      telegramId: params.telegramId,
      username: params.username,
      name: params.name,
      type: params.type ?? "start",
    },
  });
}
