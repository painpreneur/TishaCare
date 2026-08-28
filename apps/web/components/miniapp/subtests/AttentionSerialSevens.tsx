"use client";

import { useState } from "react";
import {
  SERIAL_SEVENS_SEED,
  SERIAL_SEVENS_STEP,
  SERIAL_SEVENS_COUNT,
  serialSevensCorrectSequence,
  type SerialSevensResult,
} from "@tishacare/db/client";
import type { SubtestProps } from "../TestRunner";

export default function AttentionSerialSevens({ onComplete }: SubtestProps<SerialSevensResult>) {
  const [base, setBase] = useState(SERIAL_SEVENS_SEED);
  const [value, setValue] = useState("");
  const [entered, setEntered] = useState<number[]>([]);

  function submit() {
    const num = Number(value);
    if (Number.isNaN(num)) return;
    const nextEntered = [...entered, num];
    setEntered(nextEntered);
    setValue("");

    if (nextEntered.length >= SERIAL_SEVENS_COUNT) {
      const correct = serialSevensCorrectSequence();
      const correctCount = nextEntered.filter((v, i) => v === correct[i]).length;
      onComplete({ entered: nextEntered, correctCount });
      return;
    }
    setBase(num);
  }

  return (
    <div>
      <p className="hint">
        Последовательно вычитайте {SERIAL_SEVENS_STEP}, {SERIAL_SEVENS_COUNT} раз подряд.
      </p>
      <p style={{ fontSize: 20, fontWeight: 600, margin: "12px 0" }}>
        {entered.length === 0 ? SERIAL_SEVENS_SEED : base} − {SERIAL_SEVENS_STEP} = ?
      </p>
      <div className="field">
        <input
          type="number"
          inputMode="numeric"
          value={value}
          autoFocus
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
        />
      </div>
      <button className="btn-primary btn-inline" onClick={submit} disabled={value === ""}>
        {entered.length + 1 >= SERIAL_SEVENS_COUNT ? "Готово" : "Далее"}
      </button>
      {entered.length > 0 && <p className="hint">Ваши ответы: {entered.join(", ")}</p>}
    </div>
  );
}
