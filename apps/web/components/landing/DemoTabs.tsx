"use client";

import { useState } from "react";
import styles from "@/app/page.module.css";

type Tab = {
  id: string;
  label: string;
  title: string;
  text: string;
  points: string[];
  shot: string;
  shotBar: string;
  caption: string;
  clip?: boolean;
};

const TABS: Tab[] = [
  {
    id: "dynamics",
    label: "График самочувствия",
    title: "Динамика между приёмами, а не рассказ по памяти",
    text: "Настроение, энергия и сон по ежедневным отметкам пациента. На графике видно, что происходило в те три недели, о которых на приёме уже никто не вспомнит.",
    points: [
      "Одна линия настроения, снизу полоски сна и приёма препаратов",
      "Недельное сглаживание на длинных периодах",
      "Отметки из опросников поверх графика",
    ],
    shot: "/landing/dynamics.png",
    shotBar: "Карта пациента · Самочувствие",
    caption: "График самочувствия в карточке пациента.",
  },
  {
    id: "triage",
    label: "Требуют внимания",
    title: "Список тех, к кому стоит вернуться сегодня",
    text: "Дашборд сам поднимает пациентов наверх и объясняет причину: просадка настроения, пропуски приёма препаратов, давно нет отметок, положительный MDQ, отметка о самоповреждении в PHQ-9.",
    points: [
      "Каждый флаг подписан: понятно, почему пациент в списке",
      "Спокойные пациенты не мешают и не теряются",
      "Дип-линк из флага прямо в нужный раздел карты",
    ],
    shot: "/landing/triage.png",
    shotBar: "Дашборд врача",
    caption: "Блок «Требуют внимания» на дашборде.",
  },
  {
    id: "scales",
    label: "Опросники",
    title: "Шкалы, которые пациент заполняет сам",
    text: "Бек, PHQ-9, GAD-7, YMRS, MDQ, ASRS, AQ-10, MSI-BPD, колесо баланса и когнитивная батарея. Результат с интерпретацией и дисклеймером, история по датам.",
    points: [
      "Пациент проходит между визитами, без бумаги на приёме",
      "MDQ считается по клиническим критериям, а не суммой",
      "Пороги эвристические, MVP-уровня: помощь врачу, не диагноз",
    ],
    shot: "/landing/scales.png",
    shotBar: "Карта пациента · Динамика по шкалам",
    caption: "Динамика по опросникам за всё время наблюдения.",
    clip: true,
  },
  {
    id: "record",
    label: "Карта пациента",
    title: "Всё в одном месте к началу приёма",
    text: "Закреплённый обзор сверху, дальше сворачиваемые панели: график, опросники, медикаменты, приёмы, анамнез, дневник мыслей, дневник сна. Карту можно выгрузить для истории болезни.",
    points: [
      "Сообщения врача пациенту с блоком непрочитанного",
      "Планирование приёма с напоминанием пациенту за день",
      "Экспорт в CSV и версия для печати",
    ],
    shot: "/landing/record.png",
    shotBar: "Карта пациента",
    caption: "Закреплённый обзор и сворачиваемые панели карты.",
    clip: true,
  },
];

export default function DemoTabs() {
  const [active, setActive] = useState(TABS[0].id);
  const tab = TABS.find((t) => t.id === active) ?? TABS[0];

  return (
    <div>
      <div className={styles.demoTabs} role="tablist">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={t.id === active}
            className={`${styles.demoTab} ${t.id === active ? styles.demoTabActive : ""}`}
            onClick={() => setActive(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className={styles.demoPanel} role="tabpanel">
        <div className={styles.demoPanelGrid}>
          <div>
            <h3>{tab.title}</h3>
            <p>{tab.text}</p>
            <ul className={styles.demoList}>
              {tab.points.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          </div>

          <div>
            <figure className={styles.shot}>
              <div className={styles.shotBar}>
                <i />
                <i />
                <i />
                <span>{tab.shotBar}</span>
              </div>
              <div
                className={`${styles.shotClip} ${tab.clip ? styles.shotClipFade : ""}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={tab.shot} alt={tab.caption} loading="lazy" />
              </div>
            </figure>
            <p className={styles.shotCaption}>{tab.caption}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
