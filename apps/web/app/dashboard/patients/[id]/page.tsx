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
} from "@tishacare/db";
import { getCurrentDoctor } from "@/lib/session";
import { pearsonCorrelation, describeCorrelation } from "@/lib/correlation";
import EditAnamnesis from "@/components/EditAnamnesis";
import QuestionnaireScoreChart from "@/components/QuestionnaireScoreChart";
import CognitiveCategoryChart from "@/components/CognitiveCategoryChart";
import WellbeingChart, { WellbeingPoint } from "@/components/WellbeingChart";

const QUESTIONNAIRE_MAX_SCORE: Record<string, number> = {
  [BECK_CODE]: BECK_MAX_SCORE,
  [MDQ_CODE]: MDQ_MAX_SCORE,
  [COGNITIVE_TEST_CODE]: COGNITIVE_TEST_MAX_SCORE,
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
  return "—";
}

export default async function PatientPage({ params }: { params: { id: string } }) {
  const doctor = await getCurrentDoctor();
  if (!doctor) return null;

  const patient = await prisma.patient.findFirst({
    where: { id: params.id, doctorId: doctor.id },
    include: {
      checkIns: { orderBy: { date: "asc" } },
      responses: { include: { questionnaire: true }, orderBy: { completedAt: "desc" } },
      medications: { orderBy: { createdAt: "asc" } },
      thoughts: { orderBy: { createdAt: "desc" }, take: 20 },
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

  const wellbeingSeries: WellbeingPoint[] = patient.checkIns.map((c) => ({
    date: new Date(c.date).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" }),
    moodRaw: c.mood,
    moodPct: ((c.mood + 2) / 4) * 100,
    energyRaw: c.energyLevel,
    energyPct: c.energyLevel != null ? ((c.energyLevel - 1) / 4) * 100 : null,
    sleepRaw: c.sleepHours,
    sleepPct: c.sleepHours != null ? Math.min((c.sleepHours / 12) * 100, 100) : null,
    medsRaw: c.medsTaken,
    medsPct: c.medsTaken == null ? null : c.medsTaken ? 100 : 0,
  }));

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
        <p className="empty" style={{ marginTop: 12 }}>
          Код подключения пациента: <strong>{patient.inviteCode}</strong>
        </p>
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
        {patient.medications.length === 0 ? (
          <p className="empty">Медикаменты не назначены</p>
        ) : (
          <table className="responses">
            <thead>
              <tr>
                <th>Название</th>
                <th>Дозировка</th>
                <th>Частота</th>
              </tr>
            </thead>
            <tbody>
              {patient.medications.map((m) => (
                <tr key={m.id}>
                  <td>{m.name}</td>
                  <td>{m.dosage}</td>
                  <td>{m.frequency} раз/день</td>
                </tr>
              ))}
            </tbody>
          </table>
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
