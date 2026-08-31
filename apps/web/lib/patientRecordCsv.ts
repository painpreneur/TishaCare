import { parseStateTags, stateTagLabels, MEDS_LABEL, type MedsStatus } from "@/lib/checkin";
import { describeResponse, QUESTIONNAIRE_MAX_SCORE } from "@/lib/questionnaireInterpret";
import { ENCOUNTER_TYPE_LABEL } from "@/lib/encounter";
import { MED_STATUS_LABEL, PRESCRIBER_LABEL, tagsToLabels } from "@/lib/medication";
import { parseEmotions, emotionLabels } from "@/lib/thoughts";

// One CSV file with several flat sections, for import into a clinic EHR.
// Excel-RU: `;` separator, UTF-8 with a BOM (the route adds the BOM).

const SEP = ";";

function cell(v: unknown): string {
  const s = v == null ? "" : String(v);
  if (s === "") return "";
  if (/[";\n\r]/.test(s) || s !== s.trim()) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function row(cells: unknown[]): string {
  return cells.map(cell).join(SEP);
}

const d = (v: Date | string) => new Date(v).toLocaleDateString("ru-RU");
const t = (v: Date | string) =>
  new Date(v).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });

interface RecordInput {
  name: string;
  birthDate: Date | null;
  anamnesis: string | null;
  checkIns: {
    date: Date;
    mood: number;
    stateTags: string | null;
    note: string | null;
    sleepHours: number | null;
    energyLevel: number | null;
    medsStatus: string | null;
  }[];
  sleepEntries: {
    date: Date;
    bedtime: string | null;
    wakeTime: string | null;
    hours: number;
    quality: number | null;
    note: string | null;
  }[];
  responses: {
    completedAt: Date;
    score: number;
    answers: string;
    questionnaire: { code: string; title: string };
  }[];
  medications: {
    name: string;
    dosage: string;
    frequency: number;
    status: string;
    startedAt: Date;
    endedAt: Date | null;
    prescriberType: string;
    prescriberDoctor: { name: string } | null;
    reason: string | null;
    stopReason: string | null;
    reports: {
      date: Date;
      tolerability: number | null;
      perceivedBenefit: number | null;
      sideEffectTags: string | null;
      sideEffects: string | null;
      note: string | null;
    }[];
  }[];
  encounters: {
    date: Date;
    type: string;
    status: string;
    complaints: string | null;
    observations: string | null;
    assessment: string | null;
    plan: string | null;
    note: string | null;
    doctor: { name: string };
  }[];
  thoughts: {
    createdAt: Date;
    kind: string;
    content: string;
    situation: string | null;
    reframe: string | null;
    emotions: string | null;
    intensity: number | null;
  }[];
  doctor: { name: string; clinic: { name: string } | null };
}

export function buildPatientRecordCsv(p: RecordInput): string {
  const lines: string[] = [];
  const section = (title: string) => {
    if (lines.length) lines.push("");
    lines.push(`# ${title}`);
  };

  section("Пациент");
  lines.push(row(["Имя", p.name]));
  if (p.birthDate) lines.push(row(["Дата рождения", d(p.birthDate)]));
  lines.push(row(["Лечащий врач", p.doctor.name + (p.doctor.clinic ? `, ${p.doctor.clinic.name}` : "")]));
  lines.push(row(["Выгрузка сформирована", `${d(new Date())} ${t(new Date())}`]));
  if (p.anamnesis) lines.push(row(["Анамнез", p.anamnesis]));

  section("Чек-ины");
  lines.push(row(["Дата", "Время", "Настроение (-2..2)", "Состояние", "Энергия (1..5)", "Сон, ч", "Препараты", "Заметка"]));
  for (const c of p.checkIns) {
    lines.push(
      row([
        d(c.date),
        t(c.date),
        c.mood,
        stateTagLabels(parseStateTags(c.stateTags)).join(", "),
        c.energyLevel ?? "",
        c.sleepHours != null ? c.sleepHours.toFixed(1) : "",
        c.medsStatus ? MEDS_LABEL[c.medsStatus as MedsStatus] ?? c.medsStatus : "",
        c.note ?? "",
      ]),
    );
  }

  section("Дневник сна");
  lines.push(row(["Дата", "Лёг", "Встал", "Часы", "Качество (1..5)", "Заметка"]));
  for (const s of p.sleepEntries) {
    lines.push(row([d(s.date), s.bedtime ?? "", s.wakeTime ?? "", s.hours, s.quality ?? "", s.note ?? ""]));
  }

  section("Опросники");
  lines.push(row(["Дата", "Опросник", "Балл", "Максимум", "Интерпретация"]));
  for (const r of p.responses) {
    lines.push(
      row([
        d(r.completedAt),
        r.questionnaire.title,
        r.score,
        QUESTIONNAIRE_MAX_SCORE[r.questionnaire.code] ?? "",
        describeResponse(r.questionnaire.code, r.score, r.answers),
      ]),
    );
  }

  section("Медикаменты");
  lines.push(row(["Препарат", "Дозировка", "Раз/день", "Статус", "С", "По", "Назначил", "Показание", "Причина отмены"]));
  for (const m of p.medications) {
    lines.push(
      row([
        m.name,
        m.dosage,
        m.frequency,
        MED_STATUS_LABEL[m.status as keyof typeof MED_STATUS_LABEL] ?? m.status,
        d(m.startedAt),
        m.endedAt ? d(m.endedAt) : "",
        (PRESCRIBER_LABEL[m.prescriberType] ?? m.prescriberType) +
          (m.prescriberDoctor ? ` (${m.prescriberDoctor.name})` : ""),
        m.reason ?? "",
        m.stopReason ?? "",
      ]),
    );
  }

  section("Отчёты о переносимости препаратов");
  lines.push(row(["Дата", "Препарат", "Переносимость (1..5)", "Польза (1..5)", "Побочные", "Заметка"]));
  for (const m of p.medications) {
    for (const r of m.reports) {
      lines.push(
        row([
          d(r.date),
          m.name,
          r.tolerability ?? "",
          r.perceivedBenefit ?? "",
          [tagsToLabels(r.sideEffectTags).join(", "), r.sideEffects ?? ""].filter(Boolean).join("; "),
          r.note ?? "",
        ]),
      );
    }
  }

  section("Приёмы и встречи");
  lines.push(row(["Дата", "Тип", "Статус", "Жалобы", "Статус/наблюдения", "Оценка", "План", "Заметка"]));
  for (const e of p.encounters) {
    lines.push(
      row([
        d(e.date),
        ENCOUNTER_TYPE_LABEL[e.type as keyof typeof ENCOUNTER_TYPE_LABEL] ?? e.type,
        e.status === "planned" ? "запланирован" : "состоялся",
        e.complaints ?? "",
        e.observations ?? "",
        e.assessment ?? "",
        e.plan ?? "",
        e.note ?? "",
      ]),
    );
  }

  section("Дневник мыслей");
  lines.push(row(["Дата", "Тип", "Ситуация", "Мысль", "Другой взгляд", "Эмоции", "Интенсивность (0..10)"]));
  for (const th of p.thoughts) {
    lines.push(
      row([
        d(th.createdAt),
        th.kind === "guided" ? "разбор" : "свободная",
        th.situation ?? "",
        th.content,
        th.reframe ?? "",
        emotionLabels(parseEmotions(th.emotions)).join(", "),
        th.intensity ?? "",
      ]),
    );
  }

  return lines.join("\r\n") + "\r\n";
}
