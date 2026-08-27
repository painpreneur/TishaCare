import Link from "next/link";
import { notFound } from "next/navigation";
import {
  prisma,
  BECK_CODE,
  BECK_MAX_SCORE,
  MDQ_CODE,
  MDQ_MAX_SCORE,
  COGNITIVE_TEST_CODE,
  COGNITIVE_TEST_MAX_SCORE,
  CATEGORY_LABELS,
  interpretBeck,
  MdqResult,
  CognitiveCategory,
  CognitiveTestInterpretation,
  QUESTIONNAIRE_DEFS,
  questionnaireMaxScore,
  interpretByBands,
  BALANCE_WHEEL_CODE,
} from "@tishacare/db";
import { getCurrentDoctor } from "@/lib/session";
import { DOCTOR_VISIBLE_STATUSES } from "@/lib/careLink";
import { pearsonCorrelation, describeCorrelation } from "@/lib/correlation";
import EditAnamnesis from "@/components/EditAnamnesis";
import AddEncounter from "@/components/AddEncounter";
import PrescribeMedication from "@/components/PrescribeMedication";
import { ENCOUNTER_FIELDS, ENCOUNTER_FIELD_LABEL, ENCOUNTER_TYPE_LABEL } from "@/lib/encounter";
import { MED_STATUS_LABEL, PRESCRIBER_LABEL, tagsToLabels, isPoorlyTolerated } from "@/lib/medication";
import QuestionnaireScoreChart from "@/components/QuestionnaireScoreChart";
import CognitiveCategoryChart from "@/components/CognitiveCategoryChart";
import WellbeingChart from "@/components/WellbeingChart";
import { toWellbeingSeries } from "@/lib/wellbeing";

const QUESTIONNAIRE_MAX_SCORE: Record<string, number> = {
  [BECK_CODE]: BECK_MAX_SCORE,
  [MDQ_CODE]: MDQ_MAX_SCORE,
  [COGNITIVE_TEST_CODE]: COGNITIVE_TEST_MAX_SCORE,
  ...Object.fromEntries(
    Object.values(QUESTIONNAIRE_DEFS).map((def) => [def.code, questionnaireMaxScore(def)])
  ),
};

const COGNITIVE_CATEGORY_COLORS: Record<CognitiveCategory, string> = {
  memory: "#4f6bfe",
  attention: "#22b8b0",
  thinking: "#f2a93b",
  spatial: "#a35fe0",
  speech: "#e0607a",
  regulation: "#4caf6b",
  state: "#6b7280",
};

function formatShortDate(date: Date): string {
  return date.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "2-digit" });
}

function describeResponse(code: string, score: number, answersJson: string): string {
  if (code === BECK_CODE) {
    return interpretBeck(score).diagnosis;
  }
  if (code === MDQ_CODE) {
    try {
      const result = JSON.parse(answersJson) as MdqResult;
      return result.diagnosis;
    } catch {
      return "—";
    }
  }
  if (code === COGNITIVE_TEST_CODE) {
    try {
      const { interpretation } = JSON.parse(answersJson) as { interpretation: CognitiveTestInterpretation };
      return interpretation.summary;
    } catch {
      return "—";
    }
  }
  // Sum-scale questionnaires (Beck already handled above): interpret by bands.
  if (QUESTIONNAIRE_DEFS[code]) {
    return interpretByBands(QUESTIONNAIRE_DEFS[code], score).label;
  }
  if (code === BALANCE_WHEEL_CODE) {
    try {
      const { interpretation } = JSON.parse(answersJson) as { interpretation: { note: string } };
      return interpretation.note;
    } catch {
      return "—";
    }
  }
  return "—";
}

export default async function PatientPage({ params }: { params: { id: string } }) {
  const doctor = await getCurrentDoctor();
  if (!doctor) return null;

  const patient = await prisma.patient.findFirst({
    where: {
      id: params.id,
      careLinks: { some: { doctorId: doctor.id, status: { in: [...DOCTOR_VISIBLE_STATUSES] } } },
    },
    include: {
      checkIns: { orderBy: { date: "asc" } },
      responses: { include: { questionnaire: true }, orderBy: { completedAt: "desc" } },
      medications: {
        orderBy: [{ status: "asc" }, { startedAt: "desc" }],
        include: {
          reports: { orderBy: { date: "desc" } },
          prescriberDoctor: { select: { name: true } },
        },
      },
      thoughts: { orderBy: { createdAt: "desc" }, take: 20 },
      encounters: { include: { doctor: { select: { name: true } } }, orderBy: { date: "desc" } },
    },
  });

  if (!patient) notFound();

  const cognitiveResponse = patient.responses.find((r) => r.questionnaire.code === COGNITIVE_TEST_CODE);
  let cognitiveInterpretation: CognitiveTestInterpretation | null = null;
  if (cognitiveResponse) {
    try {
      cognitiveInterpretation = (JSON.parse(cognitiveResponse.answers) as { interpretation: CognitiveTestInterpretation })
        .interpretation;
    } catch {
      cognitiveInterpretation = null;
    }
  }

  const wellbeingSeries = toWellbeingSeries(patient.checkIns);

  const medsVsMood = pearsonCorrelation(
    patient.checkIns.filter((c) => c.medsTaken !== null).map((c) => [c.medsTaken ? 1 : 0, c.mood])
  );
  const medsVsEnergy = pearsonCorrelation(
    patient.checkIns
      .filter((c) => c.medsTaken !== null && c.energyLevel !== null)
      .map((c) => [c.medsTaken ? 1 : 0, c.energyLevel as number])
  );
  const medsVsSleep = pearsonCorrelation(
    patient.checkIns
      .filter((c) => c.medsTaken !== null && c.sleepHours !== null)
      .map((c) => [c.medsTaken ? 1 : 0, c.sleepHours as number])
  );
  const medsCorrelations = [
    { label: "настроением", result: medsVsMood },
    { label: "энергией", result: medsVsEnergy },
    { label: "сном", result: medsVsSleep },
  ].filter((c): c is { label: string; result: NonNullable<typeof c.result> } => c.result !== null);

  const responsesAsc = [...patient.responses].sort(
    (a, b) => a.completedAt.getTime() - b.completedAt.getTime()
  );

  const beckSeries = responsesAsc
    .filter((r) => r.questionnaire.code === BECK_CODE)
    .map((r) => ({ date: formatShortDate(r.completedAt), score: r.score }));

  const mdqSeries = responsesAsc
    .filter((r) => r.questionnaire.code === MDQ_CODE)
    .map((r) => ({ date: formatShortDate(r.completedAt), score: r.score }));

  const cognitiveCategorySeries = responsesAsc
    .filter((r) => r.questionnaire.code === COGNITIVE_TEST_CODE)
    .map((r) => {
      const point: Record<string, string | number> = { date: formatShortDate(r.completedAt) };
      try {
        const { interpretation } = JSON.parse(r.answers) as { interpretation: CognitiveTestInterpretation };
        interpretation.categories.forEach((c) => {
          point[c.category] = Math.round((c.raw / c.max) * 100);
        });
      } catch {
        // legacy/malformed entry — skip category breakdown for this point
      }
      return point;
    });

  const cognitiveChartSeries = (Object.keys(CATEGORY_LABELS) as CognitiveCategory[]).map((key) => ({
    key,
    label: CATEGORY_LABELS[key],
    color: COGNITIVE_CATEGORY_COLORS[key],
  }));

  return (
    <div className="page">
      <Link href="/dashboard" className="back-link">
        ← Все пациенты
      </Link>
      <h2>{patient.name}</h2>

      <div className="panel">
        <h3>Самочувствие и приём препаратов</h3>
        <WellbeingChart data={wellbeingSeries} />
        {medsCorrelations.length > 0 && (
          <div className="chart-block" style={{ marginTop: 20 }}>
            <h4 className="chart-subtitle">Связь приёма препаратов с самочувствием</h4>
            <ul className="correlation-list">
              {medsCorrelations.map(({ label, result }) => (
                <li key={label}>
                  Приём препаратов ↔ {label}: r = {result.r.toFixed(2)} ({describeCorrelation(result.r)} связь), n = {result.n}{" "}
                  {result.n === 1 ? "день" : "дней"}
                </li>
              ))}
            </ul>
            <p className="hint">
              Корреляция рассчитана по самоотчётам пациента и носит описательный характер — она не доказывает
              причинно-следственную связь и не заменяет клиническую оценку.
            </p>
          </div>
        )}
      </div>

      <div className="panel">
        <h3>Анамнез</h3>
        <EditAnamnesis
          patientId={patient.id}
          anamnesis={patient.anamnesis}
          birthDate={patient.birthDate ? patient.birthDate.toISOString().slice(0, 10) : null}
        />
        {patient.anamnesisUpdatedAt && (
          <p className="empty" style={{ marginTop: 8 }}>
            Обновлено {new Date(patient.anamnesisUpdatedAt).toLocaleDateString("ru-RU")}
          </p>
        )}
        <p className="empty" style={{ marginTop: 12 }}>
          Код подключения пациента: <strong>{patient.inviteCode}</strong>
        </p>
      </div>

      <div className="panel">
        <h3>Приёмы и встречи</h3>
        <AddEncounter patientId={patient.id} />
        {patient.encounters.length === 0 ? (
          <p className="empty" style={{ marginTop: 12 }}>Записей пока нет</p>
        ) : (
          <ul className="encounter-list">
            {patient.encounters.map((e) => (
              <li key={e.id}>
                <div className="encounter-head">
                  <strong>{ENCOUNTER_TYPE_LABEL[e.type as keyof typeof ENCOUNTER_TYPE_LABEL] ?? e.type}</strong>
                  <span className="thought-date">
                    {new Date(e.date).toLocaleDateString("ru-RU")} · {e.doctor.name}
                  </span>
                </div>
                {ENCOUNTER_FIELDS.map((f) =>
                  e[f] ? (
                    <p key={f} className="encounter-field">
                      <span className="encounter-field-label">{ENCOUNTER_FIELD_LABEL[f]}:</span> {e[f]}
                    </p>
                  ) : null
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="panel">
        <h3>Результаты опросников</h3>
        {patient.responses.length === 0 ? (
          <p className="empty">Опросники ещё не проходились</p>
        ) : (
          <table className="responses">
            <thead>
              <tr>
                <th>Опросник</th>
                <th>Балл</th>
                <th>Интерпретация</th>
                <th>Дата</th>
              </tr>
            </thead>
            <tbody>
              {patient.responses.map((r) => (
                <tr key={r.id}>
                  <td>{r.questionnaire.title}</td>
                  <td>
                    {r.score}
                    {QUESTIONNAIRE_MAX_SCORE[r.questionnaire.code] != null && ` / ${QUESTIONNAIRE_MAX_SCORE[r.questionnaire.code]}`}
                  </td>
                  <td>{describeResponse(r.questionnaire.code, r.score, r.answers)}</td>
                  <td>{new Date(r.completedAt).toLocaleDateString("ru-RU")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {(beckSeries.length > 0 || mdqSeries.length > 0 || cognitiveCategorySeries.length > 0) && (
        <div className="panel">
          <h3>Динамика по шкалам</h3>
          {beckSeries.length > 0 && (
            <div className="chart-block">
              <h4 className="chart-subtitle">Шкала депрессии Бека</h4>
              <QuestionnaireScoreChart
                data={beckSeries}
                domain={[0, BECK_MAX_SCORE]}
                thresholds={[9, 15, 19, 29]}
                color="#4f6bfe"
              />
              {beckSeries.length < 2 && (
                <p className="hint">Динамика появится после повторного прохождения опросника.</p>
              )}
            </div>
          )}
          {mdqSeries.length > 0 && (
            <div className="chart-block">
              <h4 className="chart-subtitle">MDQ</h4>
              <QuestionnaireScoreChart data={mdqSeries} domain={[0, MDQ_MAX_SCORE]} thresholds={[7]} color="#e0607a" />
              {mdqSeries.length < 2 && (
                <p className="hint">Динамика появится после повторного прохождения опросника.</p>
              )}
            </div>
          )}
          {cognitiveCategorySeries.length > 0 && (
            <div className="chart-block">
              <h4 className="chart-subtitle">Когнитивный тест — по категориям</h4>
              <CognitiveCategoryChart data={cognitiveCategorySeries} series={cognitiveChartSeries} />
              {cognitiveCategorySeries.length < 2 && (
                <p className="hint">Динамика появится после повторного прохождения опросника.</p>
              )}
            </div>
          )}
        </div>
      )}

      {cognitiveInterpretation && (
        <div className="panel">
          <h3>Когнитивный тест — последний результат</h3>
          <table className="responses">
            <thead>
              <tr>
                <th>Категория</th>
                <th>Балл</th>
                <th>Уровень</th>
              </tr>
            </thead>
            <tbody>
              {cognitiveInterpretation.categories.map((c) => (
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
          <p className="hint" style={{ marginTop: 12 }}>
            {cognitiveInterpretation.disclaimer}
          </p>
        </div>
      )}

      <div className="panel">
        <h3>Медикаменты</h3>
        <PrescribeMedication patientId={patient.id} />
        {patient.medications.length === 0 ? (
          <p className="empty" style={{ marginTop: 12 }}>Медикаменты не назначены</p>
        ) : (
          <ul className="encounter-list">
            {patient.medications.map((m) => {
              const poorlyTolerated = m.reports.some((r) => isPoorlyTolerated(r.tolerability));
              return (
                <li key={m.id}>
                  <div className="encounter-head">
                    <strong>
                      {m.name}, {m.dosage}, {m.frequency} раз/день
                    </strong>
                    <span className={`badge ${m.status === "active" ? "ok" : "warn"}`}>
                      {MED_STATUS_LABEL[m.status as keyof typeof MED_STATUS_LABEL] ?? m.status}
                    </span>
                  </div>
                  <p className="encounter-field">
                    <span className="encounter-field-label">
                      {new Date(m.startedAt).toLocaleDateString("ru-RU")}
                      {m.endedAt ? ` – ${new Date(m.endedAt).toLocaleDateString("ru-RU")}` : " – по настоящее время"}
                    </span>
                    {" · "}
                    {PRESCRIBER_LABEL[m.prescriberType] ?? m.prescriberType}
                    {m.prescriberDoctor && ` (${m.prescriberDoctor.name})`}
                    {m.reason && ` · ${m.reason}`}
                  </p>
                  {poorlyTolerated && (
                    <p className="encounter-field" style={{ color: "#d64545" }}>
                      ⚠ Пациент отмечает плохую переносимость
                    </p>
                  )}
                  {m.reports.length > 0 && (
                    <div style={{ marginTop: 4 }}>
                      {m.reports.map((r) => (
                        <p key={r.id} className="encounter-field">
                          <span className="encounter-field-label">
                            {new Date(r.date).toLocaleDateString("ru-RU")}:
                          </span>{" "}
                          переносимость {r.tolerability ?? "—"}/5, польза {r.perceivedBenefit ?? "—"}/5
                          {tagsToLabels(r.sideEffectTags).length > 0 &&
                            ` · ${tagsToLabels(r.sideEffectTags).join(", ")}`}
                          {r.sideEffects && ` · ${r.sideEffects}`}
                          {r.note && ` · ${r.note}`}
                        </p>
                      ))}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="panel">
        <h3>Дневник мыслей</h3>
        {patient.thoughts.length === 0 ? (
          <p className="empty">Записей пока нет</p>
        ) : (
          <ul className="thought-list">
            {patient.thoughts.map((t) => (
              <li key={t.id}>
                <span className="thought-date">
                  {new Date(t.createdAt).toLocaleDateString("ru-RU")}
                </span>
                <span>{t.content}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
