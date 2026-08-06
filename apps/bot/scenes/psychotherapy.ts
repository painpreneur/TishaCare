import { Scenes } from "telegraf";
import OpenAI from "openai";
import { BotContext } from "../context";
import { endChatKeyboard, mainMenuKeyboard } from "../menu";

const SYSTEM_PROMPT = `Вы — виртуальный ассистент поддержки для пациента с биполярным аффективным расстройством. Ваша цель — выслушать, помочь разобраться в чувствах и мягко направить к конструктивным шагам.

Правила:
- Никогда не давайте рекомендаций по дозировкам или отмене лекарств — это может сделать только врач.
- Если пациент отклоняется от темы состояния, мягко возвращайте разговор к его самочувствию.
- Если пациент сообщает о мыслях о самоповреждении или суициде, мягко, но однозначно порекомендуйте немедленно обратиться к врачу или на горячую линию психологической помощи, и не продолжайте тему в шутливом тоне.
- Отвечайте кратко (2-4 предложения), тепло и без клинического жаргона.`;

const DISCLAIMER =
  "Это чат поддержки, а не замена консультации специалиста. При мыслях о причинении себе вреда — как можно скорее свяжитесь с врачом или горячей линией психологической помощи.\n\nНапишите, что вас беспокоит. Чтобы закончить — нажмите «Завершить».";

const MAX_TURNS = 12;

type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

function state(ctx: BotContext): Partial<{ conversation: ChatMessage[] }> {
  return ctx.wizard.state as Partial<{ conversation: ChatMessage[] }>;
}

function client() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  return new OpenAI({ apiKey });
}

export const psychotherapyScene = new Scenes.WizardScene<BotContext>(
  "psychotherapy",
  async (ctx) => {
    if (!client()) {
      await ctx.reply(
        "GPT-поддержка сейчас недоступна: не настроен OPENAI_API_KEY.",
        mainMenuKeyboard
      );
      return ctx.scene.leave();
    }

    state(ctx).conversation = [{ role: "system", content: SYSTEM_PROMPT }];
    await ctx.reply(DISCLAIMER, endChatKeyboard);
    return ctx.wizard.next();
  },
  async (ctx) => {
    const t = ctx.message && "text" in ctx.message ? ctx.message.text.trim() : undefined;
    if (!t) return;

    if (t === "Завершить" || t === "Назад") {
      await ctx.reply("Главное меню:", mainMenuKeyboard);
      return ctx.scene.leave();
    }

    const ai = client();
    if (!ai) {
      await ctx.reply("GPT-поддержка сейчас недоступна.", mainMenuKeyboard);
      return ctx.scene.leave();
    }

    const conversation = state(ctx).conversation!;
    conversation.push({ role: "user", content: t });

    if (conversation.length > MAX_TURNS * 2 + 1) {
      conversation.splice(1, 2);
    }

    await ctx.sendChatAction("typing");
    const completion = await ai.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      messages: conversation,
    });
    const reply = completion.choices[0]?.message?.content?.trim() || "Извините, не удалось получить ответ.";

    conversation.push({ role: "assistant", content: reply });
    await ctx.reply(reply, endChatKeyboard);
  }
);
