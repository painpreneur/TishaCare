import { Scenes } from "telegraf";
import { prisma } from "@mindsteady/db";
import { BotContext } from "../context";
import { getPatientByTelegramId } from "../patient";
import { backKeyboard, mainMenuKeyboard } from "../menu";

function state(ctx: BotContext): Partial<{ patientId: string }> {
  return ctx.wizard.state as Partial<{ patientId: string }>;
}

export const thoughtScene = new Scenes.WizardScene<BotContext>(
  "thought",
  async (ctx) => {
    const patient = await getPatientByTelegramId(ctx.from!.id);
    if (!patient) {
      await ctx.reply("Вы ещё не привязаны к пациенту. Отправьте /start и код приглашения.");
      return ctx.scene.leave();
    }
    state(ctx).patientId = patient.id;
    await ctx.reply("Поделитесь мыслью или нажмите «Назад».", backKeyboard);
    return ctx.wizard.next();
  },
  async (ctx) => {
    const t = ctx.message && "text" in ctx.message ? ctx.message.text.trim() : undefined;
    if (!t) return;

    if (t === "Назад") {
      await ctx.reply("Главное меню:", mainMenuKeyboard);
      return ctx.scene.leave();
    }

    await prisma.thought.create({
      data: { patientId: state(ctx).patientId!, content: t },
    });
    await ctx.reply("Мысль сохранена. Ещё что-нибудь? Или «Назад».", backKeyboard);
  }
);
