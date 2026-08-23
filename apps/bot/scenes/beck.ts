import { Markup, Scenes } from "telegraf";
import { BECK_CODE, BECK_QUESTIONS, interpretBeck, prisma } from "@mindsteady/db";
import { BotContext } from "../context";
import { getPatientByTelegramId } from "../patient";
import { mainMenuKeyboard } from "../menu";

interface BeckState {
  index: number;
  answers: number[];
}

function state(ctx: BotContext): BeckState {
  const s = ctx.wizard.state as Partial<BeckState>;
  s.index ??= 0;
  s.answers ??= [];
  return s as BeckState;
}

async function sendQuestion(ctx: BotContext) {
  const { index } = state(ctx);
  const question = BECK_QUESTIONS[index];
  await ctx.reply(
    `Вопрос ${index + 1} из ${BECK_QUESTIONS.length}: ${question.text}`,
    Markup.inlineKeyboard(
      question.options.map((o) => Markup.button.callback(o.label, `beck:${o.value}`)),
      { columns: 1 }
    )
  );
}

async function finish(ctx: BotContext) {
  const { answers } = state(ctx);
  const score = answers.reduce((a, b) => a + b, 0);
  const { diagnosis, recommendation } = interpretBeck(score);

  const patient = await getPatientByTelegramId(ctx.from!.id);
  if (patient) {
    const questionnaire = await prisma.questionnaire.upsert({
      where: { code: BECK_CODE },
      update: {},
      create: { code: BECK_CODE, title: "Опросник депрессии Бека" },
    });
    await prisma.questionnaireResponse.create({
      data: {
        patientId: patient.id,
        questionnaireId: questionnaire.id,
        score,
        answers: JSON.stringify(answers),
      },
    });
  }

  await ctx.reply(
    `Опрос завершён! Результат: ${diagnosis}.\n\n${recommendation}`,
    mainMenuKeyboard
  );
  return ctx.scene.leave();
}

export const beckScene = new Scenes.WizardScene<BotContext>(
  "beck",
  async (ctx) => {
    await sendQuestion(ctx);
    return ctx.wizard.next();
  },
  async (ctx) => {
    const data = ctx.callbackQuery && "data" in ctx.callbackQuery ? ctx.callbackQuery.data : undefined;
    if (!data?.startsWith("beck:")) {
      await ctx.reply("Пожалуйста, выберите один из вариантов на клавиатуре выше.");
      return;
    }
    await ctx.answerCbQuery();

    const s = state(ctx);
    s.answers.push(Number(data.split(":")[1]));
    s.index += 1;

    if (s.index < BECK_QUESTIONS.length) {
      await sendQuestion(ctx);
      return;
    }
    return finish(ctx);
  }
);
