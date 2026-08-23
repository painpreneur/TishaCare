import { Markup, Scenes } from "telegraf";
import {
  MDQ_CO_OCCURRENCE_QUESTION,
  MDQ_CODE,
  MDQ_IMPACT_OPTIONS,
  MDQ_IMPACT_QUESTION,
  MDQ_SYMPTOM_QUESTIONS,
  interpretMdq,
  mdqScore,
  prisma,
} from "@mindsteady/db";
import { BotContext } from "../context";
import { getPatientByTelegramId } from "../patient";
import { mainMenuKeyboard } from "../menu";

type Stage = "symptoms" | "cooccurrence" | "impact";

interface MdqState {
  stage: Stage;
  index: number;
  symptomAnswers: boolean[];
  coOccurrence?: boolean;
}

function state(ctx: BotContext): MdqState {
  const s = ctx.wizard.state as Partial<MdqState>;
  s.stage ??= "symptoms";
  s.index ??= 0;
  s.symptomAnswers ??= [];
  return s as MdqState;
}

const yesNoKeyboard = Markup.inlineKeyboard([
  Markup.button.callback("Да", "mdq_yn:yes"),
  Markup.button.callback("Нет", "mdq_yn:no"),
]);

async function sendQuestion(ctx: BotContext) {
  const s = state(ctx);

  if (s.stage === "symptoms") {
    await ctx.reply(
      `Вопрос ${s.index + 1} из ${MDQ_SYMPTOM_QUESTIONS.length}: ${MDQ_SYMPTOM_QUESTIONS[s.index]}`,
      yesNoKeyboard
    );
    return;
  }

  if (s.stage === "cooccurrence") {
    await ctx.reply(MDQ_CO_OCCURRENCE_QUESTION, yesNoKeyboard);
    return;
  }

  await ctx.reply(
    MDQ_IMPACT_QUESTION,
    Markup.inlineKeyboard(
      MDQ_IMPACT_OPTIONS.map((o) => Markup.button.callback(o.label, `mdq_impact:${o.value}`)),
      { columns: 1 }
    )
  );
}

async function finish(ctx: BotContext, impact: number) {
  const s = state(ctx);
  const result = interpretMdq(s.symptomAnswers, s.coOccurrence ?? false, impact);

  const patient = await getPatientByTelegramId(ctx.from!.id);
  if (patient) {
    const questionnaire = await prisma.questionnaire.upsert({
      where: { code: MDQ_CODE },
      update: {},
      create: { code: MDQ_CODE, title: "MDQ (Mood Disorder Questionnaire)" },
    });
    await prisma.questionnaireResponse.create({
      data: {
        patientId: patient.id,
        questionnaireId: questionnaire.id,
        score: mdqScore(result),
        answers: JSON.stringify({ ...result }),
      },
    });
  }

  await ctx.reply(
    `Опрос завершён! Результат: ${result.diagnosis}.\n\n${result.recommendation}\n\n` +
      "Напоминание: MDQ — это скрининговый, а не диагностический инструмент.",
    mainMenuKeyboard
  );
  return ctx.scene.leave();
}

export const mdqScene = new Scenes.WizardScene<BotContext>(
  "mdq",
  async (ctx) => {
    await sendQuestion(ctx);
    return ctx.wizard.next();
  },
  async (ctx) => {
    const s = state(ctx);
    const data = ctx.callbackQuery && "data" in ctx.callbackQuery ? ctx.callbackQuery.data : undefined;

    if (s.stage === "symptoms" || s.stage === "cooccurrence") {
      if (!data?.startsWith("mdq_yn:")) {
        await ctx.reply("Пожалуйста, выберите «Да» или «Нет» на клавиатуре выше.");
        return;
      }
      await ctx.answerCbQuery();
      const yes = data.split(":")[1] === "yes";

      if (s.stage === "symptoms") {
        s.symptomAnswers.push(yes);
        s.index += 1;
        if (s.index < MDQ_SYMPTOM_QUESTIONS.length) {
          await sendQuestion(ctx);
          return;
        }
        s.stage = "cooccurrence";
        await sendQuestion(ctx);
        return;
      }

      s.coOccurrence = yes;
      s.stage = "impact";
      await sendQuestion(ctx);
      return;
    }

    if (!data?.startsWith("mdq_impact:")) {
      await ctx.reply("Пожалуйста, выберите один из вариантов на клавиатуре выше.");
      return;
    }
    await ctx.answerCbQuery();
    return finish(ctx, Number(data.split(":")[1]));
  }
);
