import { Markup, Scenes } from "telegraf";
import { prisma } from "@mindsteady/db";
import { BotContext } from "../context";
import { getPatientByTelegramId } from "../patient";
import { mainMenuKeyboard } from "../menu";

type Mode =
  | "menu"
  | "add_name"
  | "add_dosage"
  | "add_frequency"
  | "edit_select"
  | "edit_field"
  | "edit_value"
  | "delete_select";

interface MedState {
  mode: Mode;
  patientId: string;
  name?: string;
  dosage?: string;
  editId?: string;
  editField?: "name" | "dosage" | "frequency";
}

function state(ctx: BotContext) {
  return ctx.wizard.state as Partial<MedState>;
}

function text(ctx: BotContext): string | undefined {
  return ctx.message && "text" in ctx.message ? ctx.message.text.trim() : undefined;
}

function callbackData(ctx: BotContext): string | undefined {
  return ctx.callbackQuery && "data" in ctx.callbackQuery ? ctx.callbackQuery.data : undefined;
}

async function renderMenu(ctx: BotContext) {
  const s = state(ctx);
  const meds = await prisma.medication.findMany({
    where: { patientId: s.patientId },
    orderBy: { createdAt: "asc" },
  });

  const list = meds.length
    ? meds.map((m) => `• ${m.name}, доза: ${m.dosage}, ${m.frequency} раз/день`).join("\n")
    : "У вас пока нет сохранённых медикаментов.";

  const keyboard = [["Добавить"]];
  if (meds.length > 0) keyboard.push(["Изменить", "Удалить"]);
  keyboard.push(["Назад"]);

  s.mode = "menu";
  await ctx.reply(`Ваши медикаменты:\n${list}`, Markup.keyboard(keyboard).resize());
}

export const medicationsScene = new Scenes.WizardScene<BotContext>(
  "medications",
  async (ctx) => {
    const patient = await getPatientByTelegramId(ctx.from!.id);
    if (!patient) {
      await ctx.reply("Вы ещё не привязаны к пациенту. Отправьте /start и код приглашения.");
      return ctx.scene.leave();
    }
    state(ctx).patientId = patient.id;
    await renderMenu(ctx);
    return ctx.wizard.next();
  },
  async (ctx) => {
    const s = state(ctx);
    const t = text(ctx);
    const data = callbackData(ctx);

    if (s.mode === "menu") {
      if (t === "Назад") {
        await ctx.reply("Главное меню:", mainMenuKeyboard);
        return ctx.scene.leave();
      }
      if (t === "Добавить") {
        s.mode = "add_name";
        await ctx.reply("Введите название медикамента:");
        return;
      }
      if (t === "Изменить" || t === "Удалить") {
        const meds = await prisma.medication.findMany({
          where: { patientId: s.patientId },
          orderBy: { createdAt: "asc" },
        });
        if (meds.length === 0) {
          await renderMenu(ctx);
          return;
        }
        const prefix = t === "Изменить" ? "edit" : "del";
        s.mode = t === "Изменить" ? "edit_select" : "delete_select";
        await ctx.reply(
          "Выберите медикамент:",
          Markup.inlineKeyboard(
            meds.map((m) => [
              Markup.button.callback(`${m.name} (${m.dosage})`, `${prefix}:${m.id}`),
            ])
          )
        );
        return;
      }
      await renderMenu(ctx);
      return;
    }

    if (s.mode === "add_name") {
      if (!t) return;
      s.name = t;
      s.mode = "add_dosage";
      await ctx.reply("Введите дозировку (например «200 мг»):");
      return;
    }

    if (s.mode === "add_dosage") {
      if (!t) return;
      s.dosage = t;
      s.mode = "add_frequency";
      await ctx.reply("Сколько раз в день принимать?");
      return;
    }

    if (s.mode === "add_frequency") {
      const frequency = Number(t);
      if (!t || !Number.isInteger(frequency) || frequency <= 0) {
        await ctx.reply("Введите целое число, например 2.");
        return;
      }
      await prisma.medication.create({
        data: { patientId: s.patientId!, name: s.name!, dosage: s.dosage!, frequency },
      });
      await ctx.reply("Медикамент сохранён!");
      await renderMenu(ctx);
      return;
    }

    if (s.mode === "delete_select") {
      if (!data?.startsWith("del:")) return;
      await ctx.answerCbQuery();
      await prisma.medication.delete({ where: { id: data.split(":")[1] } });
      await ctx.reply("Медикамент удалён.");
      await renderMenu(ctx);
      return;
    }

    if (s.mode === "edit_select") {
      if (!data?.startsWith("edit:")) return;
      await ctx.answerCbQuery();
      s.editId = data.split(":")[1];
      s.mode = "edit_field";
      await ctx.reply(
        "Что изменить?",
        Markup.inlineKeyboard([
          Markup.button.callback("Название", "field:name"),
          Markup.button.callback("Дозировка", "field:dosage"),
          Markup.button.callback("Частота", "field:frequency"),
        ])
      );
      return;
    }

    if (s.mode === "edit_field") {
      if (!data?.startsWith("field:")) return;
      await ctx.answerCbQuery();
      s.editField = data.split(":")[1] as MedState["editField"];
      s.mode = "edit_value";
      await ctx.reply("Введите новое значение:");
      return;
    }

    if (s.mode === "edit_value") {
      if (!t) return;
      const field = s.editField!;
      if (field === "frequency") {
        const frequency = Number(t);
        if (!Number.isInteger(frequency) || frequency <= 0) {
          await ctx.reply("Введите целое число.");
          return;
        }
        await prisma.medication.update({ where: { id: s.editId! }, data: { frequency } });
      } else {
        await prisma.medication.update({ where: { id: s.editId! }, data: { [field]: t } });
      }
      await ctx.reply("Медикамент обновлён!");
      await renderMenu(ctx);
      return;
    }
  }
);
