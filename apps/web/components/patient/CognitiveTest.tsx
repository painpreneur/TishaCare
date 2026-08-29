"use client";

import { useState } from "react";
import { COGNITIVE_TEST_CODE, CATEGORY_LABELS, type CognitiveTestInterpretation } from "@tishacare/db/client";
import TestRunner, { type SubtestDef } from "@/components/miniapp/TestRunner";
import MemoryEncode from "@/components/miniapp/subtests/MemoryEncode";
import AttentionSerialSevens from "@/components/miniapp/subtests/AttentionSerialSevens";
import AttentionSchulteTable from "@/components/miniapp/subtests/AttentionSchulteTable";
import ThinkingAnalogies from "@/components/miniapp/subtests/ThinkingAnalogies";
import SpatialPatternMatch from "@/components/miniapp/subtests/SpatialPatternMatch";
import VerbalFluency from "@/components/miniapp/subtests/VerbalFluency";
import RegulationGoNoGo from "@/components/miniapp/subtests/RegulationGoNoGo";
import LuscherColorTest from "@/components/miniapp/subtests/LuscherColorTest";
import MemoryDelayedRecall from "@/components/miniapp/subtests/MemoryDelayedRecall";

const SUBTESTS: SubtestDef[] = [
  {
    key: "memoryImmediate",
    title: "Запоминание слов",
    category: CATEGORY_LABELS.memory,
    description:
      "Покажем список слов на несколько секунд. Постарайтесь запомнить как можно больше, ближе к концу теста нужно будет их вспомнить.",
    Component: MemoryEncode,
  },
  {
    key: "attentionSerialSevens",
    title: "Последовательное вычитание",
    category: CATEGORY_LABELS.attention,
    description:
      "Нужно несколько раз подряд вычесть 7: от стартового числа, затем от каждого нового результата. Каждый ответ вводите отдельно.",
    Component: AttentionSerialSevens,
  },
  {
    key: "attentionSchulte",
    title: "Таблица чисел",
    category: CATEGORY_LABELS.attention,
    description:
      "На поле числа вразброс. Нажимайте их по порядку начиная с 1, как можно быстрее. Время считается с момента старта, поэтому приступайте сразу.",
    Component: AttentionSchulteTable,
  },
  {
    key: "thinkingAnalogies",
    title: "Существенные признаки",
    category: CATEGORY_LABELS.thinking,
    description: "Для каждого понятия выберите 2 слова, которые обозначают его существенные признаки.",
    Component: ThinkingAnalogies,
  },
  {
    key: "spatial",
    title: "Сравнение узоров",
    category: CATEGORY_LABELS.spatial,
    description: "Показываем узор А и несколько вариантов Б. Выберите тот вариант, который совпадает с А.",
    Component: SpatialPatternMatch,
  },
  {
    key: "verbalFluency",
    title: "Беглость речи",
    category: CATEGORY_LABELS.speech,
    description:
      "За одну минуту назовите как можно больше слов на заданную букву. Отсчёт минуты начнётся со старта.",
    Component: VerbalFluency,
  },
  {
    key: "regulation",
    title: "Реакция на сигнал",
    category: CATEGORY_LABELS.regulation,
    description:
      "По очереди будут появляться буквы. Нажимайте кнопку только на нужную букву и пропускайте остальные. Буквы пойдут сразу после старта.",
    Component: RegulationGoNoGo,
  },
  {
    key: "psychState",
    title: "Цветовые карточки",
    category: CATEGORY_LABELS.state,
    description:
      "Выбирайте цветные карточки по порядку: от самого приятного сейчас цвета к наименее приятному.",
    Component: LuscherColorTest,
  },
  {
    key: "memoryDelayed",
    title: "Отсроченное воспроизведение",
    category: CATEGORY_LABELS.memory,
    description: "Вспомните слова из самого первого задания и отметьте их в списке.",
    Component: MemoryDelayedRecall,
  },
];

// Shared by /miniapp/cognitive-test and /app/cognitive-test.
export default function CognitiveTest() {
  const [result, setResult] = useState<CognitiveTestInterpretation | null>(null);

  if (result) {
    return (
      <div className="miniapp-card">
        <h1>Тест завершён</h1>
        <p className="hint">{result.summary}</p>
        <table className="responses" style={{ marginTop: 16 }}>
          <thead>
            <tr>
              <th>Категория</th>
              <th>Балл</th>
              <th>Уровень</th>
            </tr>
          </thead>
          <tbody>
            {result.categories.map((c) => (
              <tr key={c.category}>
                <td>{c.label}</td>
                <td>
                  {c.raw}/{c.max}
                </td>
                <td>
                  <span className={`badge ${["Норма", "Выше нормы"].includes(c.level) ? "ok" : "warn"}`}>
                    {c.level}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="hint" style={{ marginTop: 16 }}>
          {result.disclaimer}
        </p>
      </div>
    );
  }

  return <TestRunner testCode={COGNITIVE_TEST_CODE} subtests={SUBTESTS} onFinished={setResult} />;
}
