import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { resolveConsentedPatient } from "@/lib/telegramAuth";

const SYSTEM_PROMPT = `Вы — виртуальный ассистент поддержки для пациента с биполярным аффективным расстройством. Ваша цель — выслушать, помочь разобраться в чувствах и мягко направить к конструктивным шагам.

Правила:
- Никогда не давайте рекомендаций по дозировкам или отмене лекарств — это может сделать только врач.
- Если пациент отклоняется от темы состояния, мягко возвращайте разговор к его самочувствию.
- Если пациент сообщает о мыслях о самоповреждении или суициде, мягко, но однозначно порекомендуйте немедленно обратиться к врачу или на горячую линию психологической помощи, и не продолжайте тему в шутливом тоне.
- Отвечайте кратко (2-4 предложения), тепло и без клинического жаргона.`;

const MAX_TURNS = 12;

type ChatMessage = { role: "user" | "assistant"; content: string };

export async function POST(req: NextRequest) {
  const auth = await resolveConsentedPatient(req);
  if (!auth) {
    return NextResponse.json({ error: "Не авторизованы" }, { status: 401 });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ available: false, message: "GPT-поддержка сейчас недоступна." });
  }

  const { messages } = (await req.json()) as { messages: ChatMessage[] };
  const trimmed = messages.slice(-MAX_TURNS * 2);

  const openai = new OpenAI({ apiKey });
  const completion = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL || "gpt-4o-mini",
    messages: [{ role: "system", content: SYSTEM_PROMPT }, ...trimmed],
  });

  const reply = completion.choices[0]?.message?.content?.trim() || "Извините, не удалось получить ответ.";
  return NextResponse.json({ available: true, reply });
}
