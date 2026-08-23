"use client";

import { useEffect, useRef, useState } from "react";
import { GO_NO_GO_LETTER_POOL, GO_NO_GO_TARGET_LETTER, GO_NO_GO_INTERVAL_MS, type GoNoGoResult } from "@mindsteady/db/client";
import type { SubtestProps } from "../TestRunner";

export default function RegulationGoNoGo({ onComplete }: SubtestProps<GoNoGoResult>) {
  const indexRef = useRef(0);
  const trialStartRef = useRef(0);
  const respondedRef = useRef(false);
  const hitsRef = useRef(0);
  const falseAlarmsRef = useRef(0);
  const missesRef = useRef(0);
  const reactionTimesRef = useRef<number[]>([]);
  const [currentLetter, setCurrentLetter] = useState(GO_NO_GO_LETTER_POOL[0]);
  const [done, setDone] = useState(false);

  useEffect(() => {
    function startTrial(i: number) {
      indexRef.current = i;
      trialStartRef.current = performance.now();
      respondedRef.current = false;
      setCurrentLetter(GO_NO_GO_LETTER_POOL[i]);
    }

    function finish() {
      setDone(true);
      const totalTargets = GO_NO_GO_LETTER_POOL.filter((l) => l === GO_NO_GO_TARGET_LETTER).length;
      const avgReactionMs = reactionTimesRef.current.length
        ? Math.round(reactionTimesRef.current.reduce((a, b) => a + b, 0) / reactionTimesRef.current.length)
        : 0;
      onComplete({
        totalTargets,
        hits: hitsRef.current,
        falseAlarms: falseAlarmsRef.current,
        misses: missesRef.current,
        avgReactionMs,
      });
    }

    startTrial(0);

    const interval = setInterval(() => {
      const i = indexRef.current;
      if (!respondedRef.current && GO_NO_GO_LETTER_POOL[i] === GO_NO_GO_TARGET_LETTER) {
        missesRef.current += 1;
      }
      const next = i + 1;
      if (next >= GO_NO_GO_LETTER_POOL.length) {
        clearInterval(interval);
        finish();
        return;
      }
      startTrial(next);
    }, GO_NO_GO_INTERVAL_MS);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleTap() {
    if (respondedRef.current || done) return;
    respondedRef.current = true;
    const reaction = performance.now() - trialStartRef.current;
    if (indexRef.current !== null && GO_NO_GO_LETTER_POOL[indexRef.current] === GO_NO_GO_TARGET_LETTER) {
      hitsRef.current += 1;
      reactionTimesRef.current.push(reaction);
    } else {
      falseAlarmsRef.current += 1;
    }
  }

  return (
    <div>
      <p className="hint">
        Нажимайте на кнопку только когда видите букву «{GO_NO_GO_TARGET_LETTER}».
      </p>
      <div className="miniapp-gng-letter">{done ? "" : currentLetter}</div>
      <button className="btn-primary btn-inline" onClick={handleTap} disabled={done}>
        Реагировать
      </button>
    </div>
  );
}
