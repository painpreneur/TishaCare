import { Markup } from "telegraf";

export const mainMenuKeyboard = Markup.keyboard([
  ["📝 Чек-ин"],
  ["Медикаменты", "Опрос"],
  ["Визуализация"],
  ["Рефлексия", "🧠 Поддержка"],
]).resize();

export const pollMenuKeyboard = Markup.keyboard([
  ["Депрессия (Бек)", "Мания (MDQ)"],
  ["Назад"],
]).resize();

export const visualizationMenuKeyboard = Markup.keyboard([
  ["Дневник мыслей", "График настроения"],
  ["Назад"],
]).resize();

export const backKeyboard = Markup.keyboard([["Назад"]]).resize();

export const endChatKeyboard = Markup.keyboard([["Завершить"]]).resize();
