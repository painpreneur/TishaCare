import { Markup, Scenes } from "telegraf";
import { prisma } from "@mindsteady/db";
import { BotContext } from "../context";
import { getPatientByTelegramId } from "../patient";
import { mainMenuKeyboard } from "../menu";

const MOOD_OPTIONS: [string, number][] = [
  ["😞 Очень плохо", -2],
  ["🙁 Плохо", -1],
  ["😐 Нормально", 0],
  ["🙂 Хорошо", 1],
  ["😄 Отлично", 2],
];

const ENERGY_OPTIONS: [string, number][] = [
  ["1", 1],
  ["2", 2],
  ["3", 3],
  ["4", 4],
  ["5", 5],
];

interface CheckinState {
  mood: number;
  sleepHours: number;
  energyLevel: number;
}

function state(ctx: BotContext): Partial<CheckinState> {
  return ctx.wizard.state as Partial<CheckinState>;
}

export const checkinScene = new Scenes.WizardScene<BotContext>(
  "checkin",
  async (ctx) => {
    const patient = await getPatientByTelegramId(ctx.from!.id);
    if (!patient) {
      await ctx.reply(
        "Вы ещё не привязаны к пациенту. Отправьте /start и код приглашения от вашего врача."
      );
      return ctx.scene.leave();
    }

    await ctx.reply(
      "Как ваше настроение сегодня?",
      Markup.inlineKeyboard(
        MOOD_OPTIONS.map(([label, value]) => Markup.button.callback(label, `mood:${value}`))
      )
    );
    return ctx.wizard.next();
  },
  async (ctx) => {
    const data = ctx.callbackQuery && "data" in ctx.callbackQuery ? ctx.callbackQuery.data : undefined;
    if (!data?.startsWith("mood:")) {
      await ctx.reply("Пожалуйста, выберите настроение на клавиатуре выше.");
      return;
    }
    await ctx.answerCbQuery();
    state(ctx).mood = Number(data.split(":")[1]);
    await ctx.reply("Сколько часов вы спали этой ночью? (введите число)");
    return ctx.wizard.next();
  },
  async (ctx) => {
    if (!ctx.message || !("text" in ctx.message)) {
      await ctx.reply("Введите число часов сна, например 7.5");
      return;
    }
    const hours = Number(ctx.message.text.replace(",", "."));
    if (Number.isNaN(hours) || hours < 0 || hours > 24) {
      await ctx.reply("Введите число часов сна, например 7.5");
      return;
    }
    state(ctx).sleepHours = hours;
    await ctx.reply(
      "Как оцените уровень энергии сегодня (1-5)?",
      Markup.inlineKeyboard(
        ENERGY_OPTIONS.map(([label, value]) => Markup.button.callback(label, `energy:${value}`))
      )
    );
    return ctx.wizard.next();
  },
  async (ctx) => {
    const data = ctx.callbackQuery && "data" in ctx.callbackQuery ? ctx.callbackQuery.data : undefined;
    if (!data?.startsWith("energy:")) {
      await ctx.reply("Пожалуйста, выберите уровень энергии на клавиатуре выше.");
      return;
    }
    await ctx.answerCbQuery();
    state(ctx).energyLevel = Number(data.split(":")[1]);
    await ctx.reply(
      "Принимали лекарства сегодня?",
      Markup.inlineKeyboard([
        Markup.button.callback("Да", "meds:yes"),
        Markup.button.callback("Нет", "meds:no"),
      ])
    );
    return ctx.wizard.next();
  },
  async (ctx) => {
    const data = ctx.callbackQuery && "data" in ctx.callbackQuery ? ctx.callbackQuery.data : undefined;
    if (!data?.startsWith("meds:")) {
      await ctx.reply("Пожалуйста, выберите вариант на клавиатуре выше.");
      return;
    }
    await ctx.answerCbQuery();
    const medsTaken = data.split(":")[1] === "yes";

    const patient = await getPatientByTelegramId(ctx.from!.id);
    if (patient) {
      const s = state(ctx);
      await prisma.checkIn.create({
        data: {
          patientId: patient.id,
          mood: s.mood!,
          sleepHours: s.sleepHours,
          energyLevel: s.energyLevel,
          medsTaken,
        },
      });
    }

    await ctx.reply("Спасибо! Данные сохранены. Хорошего дня 🙌", mainMenuKeyboard);
    return ctx.scene.leave();
  }
);
