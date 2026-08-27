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
  { key: "memoryImmediate", title: "Запоминание слов", category: CATEGORY_LABELS.memory, Component: MemoryEncode },
  {
    key: "attentionSerialSevens",
    title: "Последовательное вычитание",
    category: CATEGORY_LABELS.attention,
    Component: AttentionSerialSevens,
  },
  {
    key: "attentionSchulte",
    title: "Таблица чисел",
    category: CATEGORY_LABELS.attention,
    Component: AttentionSchulteTable,
  },
  { key: "thinkingAnalogies", title: "Существенные признаки", category: CATEGORY_LABELS.thinking, Component: ThinkingAnalogies },
  { key: "spatial", title: "Сравнение узоров", category: CATEGORY_LABELS.spatial, Component: SpatialPatternMatch },
  { key: "verbalFluency", title: "Беглость речи", category: CATEGORY_LABELS.speech, Component: VerbalFluency },
  { key: "regulation", title: "Реакция на сигнал", category: CATEGORY_LABELS.regulation, Component: RegulationGoNoGo },
  { key: "psychState", title: "Цветовые карточки", category: CATEGORY_LABELS.state, Component: LuscherColorTest },
  {
    key: "memoryDelayed",
    title: "Отсроченное воспроизведение",
    category: CATEGORY_LABELS.memory,
    Component: MemoryDelayedRecall,
  },
];

export default function CognitiveTestPage() {
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
