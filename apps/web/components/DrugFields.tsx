"use client";

import { useState } from "react";
import { DRUG_GROUPS, findRefDrug } from "@tishacare/db/client";

const OTHER = "__other";

// Group -> drug -> dosage pickers over the built-in reference (@tishacare/db
// medReference), with a plain manual mode for anything not listed. Only the
// group's own drugs render at a time, so the whole formulary is never in the
// DOM at once. Controlled: the parent owns `name` / `dosage`.
export default function DrugFields({
  name,
  dosage,
  onName,
  onDosage,
}: {
  name: string;
  dosage: string;
  onName: (v: string) => void;
  onDosage: (v: string) => void;
}) {
  const known = findRefDrug(name);
  const [manual, setManual] = useState<boolean>(!!name && !known);
  const [groupId, setGroupId] = useState<string>(known?.group.id ?? "");

  if (manual) {
    return (
      <>
        <div className="field" style={{ flex: "1 1 160px" }}>
          <label>Название</label>
          <input value={name} onChange={(e) => onName(e.target.value)} />
        </div>
        <div className="field" style={{ flex: "0 0 120px" }}>
          <label>Дозировка</label>
          <input value={dosage} onChange={(e) => onDosage(e.target.value)} placeholder="200 мг" />
        </div>
        <button
          type="button"
          className="link-btn"
          style={{ alignSelf: "flex-end", marginBottom: 16 }}
          onClick={() => setManual(false)}
        >
          Выбрать из справочника
        </button>
      </>
    );
  }

  const group = DRUG_GROUPS.find((g) => g.id === groupId);
  const drug = group?.drugs.find((d) => d.name === name);
  const dosageIsOther = !!drug && !!dosage && !drug.dosages.includes(dosage);

  return (
    <>
      <div className="field" style={{ flex: "1 1 160px" }}>
        <label>Группа</label>
        <select
          value={groupId}
          onChange={(e) => {
            setGroupId(e.target.value);
            onName("");
            onDosage("");
          }}
        >
          <option value="">Выберите группу</option>
          {DRUG_GROUPS.map((g) => (
            <option key={g.id} value={g.id}>
              {g.label}
            </option>
          ))}
        </select>
      </div>

      {group && (
        <div className="field" style={{ flex: "1 1 160px" }}>
          <label>Препарат</label>
          <select
            value={name}
            onChange={(e) => {
              onName(e.target.value);
              onDosage("");
            }}
          >
            <option value="">Выберите препарат</option>
            {group.drugs.map((d) => (
              <option key={d.name} value={d.name}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {drug && (
        <div className="field" style={{ flex: "0 0 140px" }}>
          <label>Дозировка</label>
          <select
            value={dosageIsOther ? OTHER : dosage}
            onChange={(e) => onDosage(e.target.value === OTHER ? " " : e.target.value)}
          >
            <option value="">Выберите</option>
            {drug.dosages.map((dz) => (
              <option key={dz} value={dz}>
                {dz}
              </option>
            ))}
            <option value={OTHER}>Другая…</option>
          </select>
          {dosageIsOther && (
            <input
              value={dosage.trim()}
              onChange={(e) => onDosage(e.target.value)}
              placeholder="напр. 125 мг"
              style={{ marginTop: 6 }}
            />
          )}
        </div>
      )}

      <button
        type="button"
        className="link-btn"
        style={{ alignSelf: "flex-end", marginBottom: 16 }}
        onClick={() => setManual(true)}
      >
        Ввести вручную
      </button>
    </>
  );
}
