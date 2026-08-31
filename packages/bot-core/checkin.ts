import { Telegraf, Markup, Context } from "telegraf";
import { message } from "telegraf/filters";
import type { InlineKeyboardButton } from "telegraf/types";
import {
  prisma,
  MOOD_SCALE,
  MOOD_EMOJI,
  STATE_TAGS,
  MEDS_OPTIONS,
  MEDS_LABEL,
  NOTE_MAX_LENGTH,
  type MedsStatus,
} from "@tishacare/db";
// A full check-in done entirely from Telegram, no Mini App needed. Two shapes,
// matching the in-app form:
//   moment ("Сейчас")  — mood + state tags + energy
//   day    ("Итог дня") — mood + hours slept + meds taken
// The wizard is stateless: every partial answer is carried in the inline
// button `callback_data` (kept well under Telegram's 64-byte cap), so it works
// the same under the webhook (serverless) and local polling.
//
// The free-text note is added after saving, via a force-reply prompt.

type Mode = "mom" | "day";

// One-letter codes for state tags, so a multi-select fits in callback_data.
// Every id in STATE_TAGS needs one — see the assertion below.
const TAG_CODE: Record<string, string> = {
  calm: "c",
  anxious: "x",
  activated: "v",
  restless: "e",
  slowed: "s",
  empty: "p",
  irritable: "r",
  foggy: "f",
  mixed: "m",
};
const CODE_TAG: Record<string, string> = Object.fromEntries(
  Object.entries(TAG_CODE).map(([id, code]) => [code, id]),
);

// Fail fast if a STATE_TAGS entry has no code — its bot button would silently
// do nothing (callback_data would carry "undefined").
for (const t of STATE_TAGS) {
  if (!TAG_CODE[t.id]) throw new Error(`checkin: no TAG_CODE for state tag "${t.id}"`);
}

// Whole hours of sleep. Buttons carry the exact number in callback_data — no
// buckets, no representative midpoint that reads as false precision. The
// endpoints are inclusive ("≤4" stores 4, "≥11" stores 11).
const SLEEP_HOURS: { label: string; h: number }[] = [
  { label: "≤4", h: 4 },
  { label: "5", h: 5 },
  { label: "6", h: 6 },
  { label: "7", h: 7 },
  { label: "8", h: 8 },
  { label: "9", h: 9 },
  { label: "10", h: 10 },
  { label: "≥11", h: 11 },
];

const NOTE_PROMPT = "Напишите заметку к отметке одним сообщением.";
const CANCEL_BTN = Markup.button.callback("✕ Отмена", "ci:x");

function decodeTags(sel: string): string[] {
  if (!sel || sel === "-") return [];
  return [...sel].map((code) => CODE_TAG[code]).filter(Boolean);
}

function toggleCode(sel: string, code: string): string {
  const set = new Set(sel === "-" ? [] : [...sel]);
  if (set.has(code)) set.delete(code);
  else set.add(code);
  const next = [...set].join("");
  return next || "-";
}

async function loadConsentedPatient(ctx: Context) {
  const telegramId = String(ctx.from!.id);
  const patient = await prisma.patient.findUnique({ where: { telegramId } });
  if (!patient) return { patient: null, reason: "start" as const };
  if (!patient.consentAt) return { patient: null, reason: "consent" as const };
  return { patient, reason: null };
}

// ── keyboards ────────────────────────────────────────────────────────────────

function modeKeyboard() {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback("🕐 Сейчас", "ci:go:mom"),
      Markup.button.callback("🌙 Итог дня", "ci:go:day"),
    ],
    [CANCEL_BTN],
  ]);
}

function moodKeyboard(mode: Mode) {
  return Markup.inlineKeyboard([
    MOOD_SCALE.map((m) => Markup.button.callback(m.emoji, `ci:mood:${mode}:${m.value}`)),
    [CANCEL_BTN],
  ]);
}

function tagKeyboard(mood: number, sel: string) {
  const rows: InlineKeyboardButton[][] = [];
  for (let i = 0; i < STATE_TAGS.length; i += 2) {
    rows.push(
      STATE_TAGS.slice(i, i + 2).map((t) => {
        const code = TAG_CODE[t.id];
        const on = sel !== "-" && sel.includes(code);
        return Markup.button.callback(`${on ? "☑ " : ""}${t.label}`, `ci:tag:${mood}:${sel}:${code}`);
      }),
    );
  }
  rows.push([
    Markup.button.callback("Дальше ➡️", `ci:tagok:${mood}:${sel}`),
    Markup.button.callback("Пропустить ⏭️", `ci:tagok:${mood}:-`),
  ]);
  rows.push([CANCEL_BTN]);
  return Markup.inlineKeyboard(rows);
}

function energyKeyboard(mood: number, sel: string) {
  return Markup.inlineKeyboard([
    [1, 2, 3, 4, 5].map((e) => Markup.button.callback(String(e), `ci:en:${mood}:${sel}:${e}`)),
    [Markup.button.callback("Пропустить ⏭️", `ci:en:${mood}:${sel}:0`)],
    [CANCEL_BTN],
  ]);
}

// Sleep is asked as whole hours and, in the "итог дня" flow, is not skippable —
// it is a core part of the day's picture (and a key signal in bipolar care).
function sleepKeyboard(mood: number) {
  const rows: InlineKeyboardButton[][] = [];
  for (let i = 0; i < SLEEP_HOURS.length; i += 4) {
    rows.push(
      SLEEP_HOURS.slice(i, i + 4).map((s) =>
        Markup.button.callback(s.label, `ci:sl:${mood}:${s.h}`),
      ),
    );
  }
  rows.push([CANCEL_BTN]);
  return Markup.inlineKeyboard(rows);
}

function medsKeyboard(mood: number, h: number) {
  return Markup.inlineKeyboard([
    MEDS_OPTIONS.map((o) => Markup.button.callback(o.label, `ci:md:${mood}:${h}:${o.id[0]}`)),
    [Markup.button.callback("Пропустить ⏭️", `ci:md:${mood}:${h}:-`)],
    [CANCEL_BTN],
  ]);
}

function doneKeyboard() {
  const rows: InlineKeyboardButton[][] = [[Markup.button.callback("➕ Заметка", "ci:note")]];
  const webAppUrl = process.env.WEBAPP_URL;
  if (webAppUrl) {
    rows.push([Markup.button.webApp("Открыть приложение", `${webAppUrl}/miniapp/checkin`)]);
  }
  return Markup.inlineKeyboard(rows);
}

// ── summary + save ───────────────────────────────────────────────────────────

function summaryLine(opts: {
  mood: number;
  tags?: string[];
  energy?: number | null;
  sleepHours?: number | null;
  meds?: MedsStatus | null;
}) {
  const parts = [MOOD_EMOJI[opts.mood] ?? ""].filter(Boolean);
  if (opts.tags && opts.tags.length) {
    parts.push(opts.tags.map((id) => STATE_TAGS.find((t) => t.id === id)?.label ?? id).join(", "));
  }
  if (opts.energy) parts.push(`энергия ${opts.energy}/5`);
  if (opts.sleepHours != null) parts.push(`сон ${opts.sleepHours} ч`);
  if (opts.meds) parts.push(`препараты ${MEDS_LABEL[opts.meds]}`);
  // First line makes it unmistakable the check-in is saved; second line is the
  // recap of what went in.
  return `Готово, отметка сохранена ✅\n\n${parts.join(" · ")}`;
}

async function saveCheckIn(
  patientId: string,
  data: {
    mood: number;
    stateTags?: string[];
    energyLevel?: number | null;
    sleepHours?: number | null;
    medsStatus?: MedsStatus | null;
  },
) {
  await prisma.checkIn.create({
    data: {
      patientId,
      mood: data.mood,
      stateTags: data.stateTags && data.stateTags.length ? JSON.stringify(data.stateTags) : null,
      energyLevel: data.energyLevel ?? null,
      sleepHours: data.sleepHours ?? null,
      medsStatus: data.medsStatus ?? null,
    },
  });
  // Milestone / unlock rows are recomputed on the next web-side write or app
  // open (the dam stage itself is derived live), so the bot flow deliberately
  // doesn't reach into apps/web to do it here.
}

// ── registration ────────────────────────────────────────────────────────────

export function registerCheckinWizard(bot: Telegraf) {
  bot.command("checkin", async (ctx) => {
    const { patient, reason } = await loadConsentedPatient(ctx);
    if (reason === "start") return ctx.reply("Сначала нажмите /start, чтобы начать.");
    if (reason === "consent") {
      return ctx.reply(
        "Откройте приложение и подтвердите согласие на обработку данных, потом можно будет отмечаться прямо здесь.",
      );
    }
    if (!patient) return;
    return ctx.reply("Как отметимся?", modeKeyboard());
  });

  bot.action("ci:x", async (ctx) => {
    await ctx.answerCbQuery();
    return ctx.editMessageText("Отметку отменил. Наберите /checkin, когда будете готовы.");
  });

  // mode picked -> ask mood
  bot.action(/^ci:go:(mom|day)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const mode = ctx.match[1] as Mode;
    return ctx.editMessageText(
      mode === "mom" ? "Как настроение сейчас?" : "Каким было настроение за день?",
      moodKeyboard(mode),
    );
  });

  // mood picked
  bot.action(/^ci:mood:(mom|day):(-?[0-2])$/, async (ctx) => {
    await ctx.answerCbQuery();
    const mode = ctx.match[1] as Mode;
    const mood = Number(ctx.match[2]);
    if (mode === "mom") {
      return ctx.editMessageText("Как это ощущается? Можно выбрать несколько.", tagKeyboard(mood, "-"));
    }
    return ctx.editMessageText("Сколько часов спали?", sleepKeyboard(mood));
  });

  // moment: toggle a tag
  bot.action(/^ci:tag:(-?[0-2]):([a-z-]+):([a-z])$/, async (ctx) => {
    await ctx.answerCbQuery();
    const mood = Number(ctx.match[1]);
    const sel = toggleCode(ctx.match[2], ctx.match[3]);
    return ctx.editMessageReplyMarkup(tagKeyboard(mood, sel).reply_markup);
  });

  // moment: tags done -> ask energy
  bot.action(/^ci:tagok:(-?[0-2]):([a-z-]+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const mood = Number(ctx.match[1]);
    const sel = ctx.match[2];
    return ctx.editMessageText("Сколько энергии сейчас?", energyKeyboard(mood, sel));
  });

  // moment: energy picked -> SAVE
  bot.action(/^ci:en:(-?[0-2]):([a-z-]+):([0-5])$/, async (ctx) => {
    await ctx.answerCbQuery();
    const { patient } = await loadConsentedPatient(ctx);
    if (!patient) return ctx.editMessageText("Откройте приложение, чтобы отметиться.");
    const mood = Number(ctx.match[1]);
    const tags = decodeTags(ctx.match[2]);
    const energy = Number(ctx.match[3]) || null;
    await saveCheckIn(patient.id, { mood, stateTags: tags, energyLevel: energy });
    return ctx.editMessageText(summaryLine({ mood, tags, energy }), doneKeyboard());
  });

  // day: sleep picked -> ask meds
  bot.action(/^ci:sl:(-?[0-2]):(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const mood = Number(ctx.match[1]);
    const hours = Number(ctx.match[2]);
    return ctx.editMessageText("Приняли лекарства сегодня?", medsKeyboard(mood, hours));
  });

  // day: meds picked -> SAVE
  bot.action(/^ci:md:(-?[0-2]):(\d+):([ypn-])$/, async (ctx) => {
    await ctx.answerCbQuery();
    const { patient } = await loadConsentedPatient(ctx);
    if (!patient) return ctx.editMessageText("Откройте приложение, чтобы отметиться.");
    const mood = Number(ctx.match[1]);
    const hours = Number(ctx.match[2]);
    const medsCode = ctx.match[3];
    const sleepHours = hours > 0 ? hours : null;
    const meds: MedsStatus | null =
      medsCode === "y" ? "yes" : medsCode === "p" ? "partial" : medsCode === "n" ? "no" : null;
    await saveCheckIn(patient.id, { mood, sleepHours, medsStatus: meds });
    return ctx.editMessageText(summaryLine({ mood, sleepHours, meds }), doneKeyboard());
  });

  // "➕ Заметка" -> force-reply prompt
  bot.action("ci:note", async (ctx) => {
    await ctx.answerCbQuery();
    return ctx.reply(NOTE_PROMPT, Markup.forceReply());
  });

  // The reply to that prompt: attach it to the most recent note-less check-in.
  bot.on(message("text"), async (ctx, next) => {
    const replyTo = (ctx.message as { reply_to_message?: { text?: string } }).reply_to_message;
    if (replyTo?.text !== NOTE_PROMPT) return next();

    const { patient } = await loadConsentedPatient(ctx);
    if (!patient) return ctx.reply("Откройте приложение, чтобы добавить заметку.");

    const since = new Date(Date.now() - 20 * 60 * 1000);
    const recent = await prisma.checkIn.findFirst({
      where: { patientId: patient.id, note: null, date: { gte: since } },
      orderBy: { date: "desc" },
    });
    if (!recent) {
      return ctx.reply("Не нашёл недавнюю отметку. Заметку можно добавить в приложении.");
    }
    const note = ctx.message.text.trim().slice(0, NOTE_MAX_LENGTH);
    await prisma.checkIn.update({ where: { id: recent.id }, data: { note } });
    return ctx.reply("Заметку сохранил.");
  });
}
