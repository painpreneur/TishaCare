import "dotenv/config";
import { Scenes, Telegraf, session } from "telegraf";
import { message } from "telegraf/filters";
import { prisma } from "@mindsteady/db";
import { BotContext } from "./context";
import { getPatientByTelegramId } from "./patient";
import { mainMenuKeyboard, pollMenuKeyboard, visualizationMenuKeyboard } from "./menu";
import { checkinScene } from "./scenes/checkin";
import { beckScene } from "./scenes/beck";
import { mdqScene } from "./scenes/mdq";
import { medicationsScene } from "./scenes/medications";
import { thoughtScene } from "./scenes/thought";
import { psychotherapyScene } from "./scenes/psychotherapy";
import { scheduleReminders } from "./reminders";

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  throw new Error("TELEGRAM_BOT_TOKEN is not set. Add it to apps/bot/.env — get one from @BotFather.");
}

const bot = new Telegraf<BotContext>(token);

const stage = new Scenes.Stage<BotContext>([
  checkinScene,
  beckScene,
  mdqScene,
  medicationsScene,
  thoughtScene,
  psychotherapyScene,
]);

bot.use(session());
bot.use(stage.middleware());

const MOOD_EMOJI: Record<number, string> = { [-2]: "😞", [-1]: "🙁", 0: "😐", 1: "🙂", 2: "😄" };

bot.start(async (ctx) => {
  const code = ctx.startPayload?.trim().toUpperCase();

  if (!code) {
    await ctx.reply(
      "Привет! Я помогу отслеживать ваше состояние между визитами к врачу.\n\n" +
        "Чтобы начать, отправьте код приглашения, который вам дал врач, в формате:\n/start ВАШКОД"
    );
    return;
  }

  const patient = await prisma.patient.findUnique({ where: { inviteCode: code } });
  if (!patient) {
    await ctx.reply("Код не найден. Проверьте код у своего врача и попробуйте снова.");
    return;
  }

  await prisma.patient.update({
    where: { id: patient.id },
    data: { telegramId: String(ctx.from.id) },
  });

  await ctx.reply(`Готово, ${patient.name}! Вы привязаны к платформе.`, mainMenuKeyboard);
});

bot.help((ctx) =>
  ctx.reply(
    "Команды:\n/start КОД — привязать аккаунт\n/checkin — ежедневная отметка состояния\n\n" +
      "Остальное доступно через меню внизу экрана.",
    mainMenuKeyboard
  )
);

bot.command("checkin", (ctx) => ctx.scene.enter("checkin"));

bot.hears("📝 Чек-ин", (ctx) => ctx.scene.enter("checkin"));
bot.hears("Медикаменты", (ctx) => ctx.scene.enter("medications"));
bot.hears("Рефлексия", (ctx) => ctx.scene.enter("thought"));
bot.hears("🧠 Поддержка", (ctx) => ctx.scene.enter("psychotherapy"));

bot.hears("Опрос", (ctx) => ctx.reply("Какой опрос пройти?", pollMenuKeyboard));
bot.hears("Депрессия (Бек)", (ctx) => ctx.scene.enter("beck"));
bot.hears("Мания (MDQ)", (ctx) => ctx.scene.enter("mdq"));

bot.hears("Визуализация", (ctx) => ctx.reply("Что посмотреть?", visualizationMenuKeyboard));

bot.hears("Дневник мыслей", async (ctx) => {
  const patient = await getPatientByTelegramId(ctx.from.id);
  if (!patient) return;

  const thoughts = await prisma.thought.findMany({
    where: { patientId: patient.id },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  if (thoughts.length === 0) {
    await ctx.reply("У вас пока нет сохранённых мыслей.", mainMenuKeyboard);
    return;
  }

  const list = thoughts
    .map((t) => `${t.createdAt.toLocaleDateString("ru-RU")}: ${t.content}`)
    .join("\n\n");
  await ctx.reply(`Ваши мысли:\n\n${list}`, mainMenuKeyboard);
});

bot.hears("График настроения", async (ctx) => {
  const patient = await getPatientByTelegramId(ctx.from.id);
  if (!patient) return;

  const checkIns = await prisma.checkIn.findMany({
    where: { patientId: patient.id },
    orderBy: { date: "desc" },
    take: 14,
  });

  if (checkIns.length === 0) {
    await ctx.reply("Пока нет данных чек-инов.", mainMenuKeyboard);
    return;
  }

  const lines = checkIns
    .reverse()
    .map((c) => {
      const date = c.date.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" });
      const mood = MOOD_EMOJI[c.mood] ?? c.mood;
      const sleep = c.sleepHours != null ? `${c.sleepHours.toFixed(1)} ч сна` : "—";
      const meds = c.medsTaken ? "✅ лекарства" : "⛔️ лекарства";
      return `${date}: ${mood}  ${sleep}  ${meds}`;
    })
    .join("\n");

  await ctx.reply(
    `Последние отметки:\n\n${lines}\n\nПодробный график доступен врачу в веб-панели.`,
    mainMenuKeyboard
  );
});

bot.hears("Назад", (ctx) => ctx.reply("Главное меню:", mainMenuKeyboard));

bot.on(message("text"), (ctx) => ctx.reply("Выберите действие в меню ниже:", mainMenuKeyboard));

scheduleReminders(bot);

bot.launch().then(() => console.log("Bot started"));

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
