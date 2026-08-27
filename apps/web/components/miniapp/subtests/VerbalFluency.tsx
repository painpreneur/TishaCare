"use client";

import { useEffect, useRef, useState } from "react";
import { FLUENCY_LETTER, FLUENCY_SECONDS, type FluencyResult } from "@tishacare/db/client";
import type { SubtestProps } from "../TestRunner";

export default function VerbalFluency({ onComplete }: SubtestProps<FluencyResult>) {
  const [secondsLeft, setSecondsLeft] = useState(FLUENCY_SECONDS);
  const [value, setValue] = useState("");
  const [words, setWords] = useState<string[]>([]);
  const finishedRef = useRef(false);

  function finish(finalWords: string[]) {
    if (finishedRef.current) return;
    finishedRef.current = true;
    onComplete({ letter: FLUENCY_LETTER, words: finalWords, count: finalWords.length });
  }

  useEffect(() => {
    if (secondsLeft <= 0) {
      finish(words);
      return;
    }
    const timer = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsLeft]);

  function addWord() {
    const word = value.trim().toLowerCase();
    if (word && word[0] === FLUENCY_LETTER.toLowerCase() && !words.includes(word)) {
      setWords((prev) => [...prev, word]);
    }
    setValue("");
  }

  return (
    <div>
      <p className="hint">
        Назовите как можно больше слов, начинающихся на букву «{FLUENCY_LETTER}». Осталось: {secondsLeft}с
      </p>
      <div className="field">
        <input
          value={value}
          autoFocus
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addWord()}
          placeholder={`Слово на «${FLUENCY_LETTER}»`}
        />
      </div>
      <button className="btn-primary btn-inline" onClick={addWord}>
        Добавить
      </button>
      <p className="hint" style={{ marginTop: 12 }}>
        Слова ({words.length}): {words.join(", ")}
      </p>
      <button className="link-btn" style={{ marginTop: 12 }} onClick={() => finish(words)}>
        Завершить досрочно
      </button>
    </div>
  );
}
