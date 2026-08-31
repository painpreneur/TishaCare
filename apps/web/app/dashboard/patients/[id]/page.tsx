import Link from "next/link";
import { notFound } from "next/navigation";
import {
  prisma,
  BECK_CODE,
  BECK_MAX_SCORE,
  MDQ_CODE,
  MDQ_MAX_SCORE,
  PHQ9_CODE,
  YMRS_CODE,
  COGNITIVE_TEST_CODE,
  CATEGORY_LABELS,
  CognitiveCategory,
  CognitiveTestInterpretation,
} from "@tishacare/db";
import { getCurrentDoctor } from "@/lib/session";
import { describeResponse, QUESTIONNAIRE_MAX_SCORE } from "@/lib/questionnaireInterpret";
import { DOCTOR_VISIBLE_STATUSES } from "@/lib/careLink";
import { patientAccessWhere } from "@/lib/patientAccess";
import { clinicLicenseInactive } from "@/lib/license";
import { pearsonCorrelation, describeCorrelation } from "@/lib/correlation";
import EditAnamnesis from "@/components/EditAnamnesis";
import AddEncounter from "@/components/AddEncounter";
import PlannedEncounters from "@/components/PlannedEncounters";
import PrescribeMedication from "@/components/PrescribeMedication";
import DoctorMedControls from "@/components/DoctorMedControls";
import DoctorUnlinkPatient from "@/components/DoctorUnlinkPatient";
import { ENCOUNTER_FIELDS, ENCOUNTER_FIELD_LABEL, ENCOUNTER_TYPE_LABEL } from "@/lib/encounter";
import { MED_STATUS_LABEL, PRESCRIBER_LABEL, tagsToLabels, isPoorlyTolerated } from "@/lib/medication";
import QuestionnaireScoreChart from "@/components/QuestionnaireScoreChart";
import CognitiveCategoryChart from "@/components/CognitiveCategoryChart";
import WellbeingChart from "@/components/WellbeingChart";
import { toWellbeingSeries } from "@/lib/wellbeing";
import { buildPatientInsights } from "@/lib/insights";
import { doctorDamLine } from "@/lib/gamification";
import { medsToNumber } from "@/lib/checkin";
import { parseEmotions, emotionLabels } from "@/lib/thoughts";

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

export default async function PatientPage({ params }: { params: { id: string } }) {
  const doctor = await getCurrentDoctor();
  if (!doctor) return null;

  const licenseInactive = clinicLicenseInactive(doctor);

  const patient = await prisma.patient.findFirst({
    where: { id: params.id, ...patientAccessWhere(doctor) },
    include: {
      careLinks: {
        where: { doctorId: doctor.id, status: { in: [...DOCTOR_VISIBLE_STATUSES] } },
        select: { id: true },
      },
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
  const insights = buildPatientInsights(patient.checkIns, patient.responses);
  const damLine = doctorDamLine(patient.checkIns, patient.responses);

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const plannedEncounters = patient.encounters
    .filter((e) => e.status === "planned")
    .sort((a, b) => a.date.getTime() - b.date.getTime());
  const doneEncounters = patient.encounters.filter((e) => e.status !== "planned");

  const medsNum = (c: { medsStatus: string | null }) => medsToNumber(c.medsStatus);
  const medsVsMood = pearsonCorrelation(
    patient.checkIns.filter((c) => medsNum(c) !== null).map((c) => [medsNum(c) as number, c.mood])
  );
  const medsVsEnergy = pearsonCorrelation(
    patient.checkIns
      .filter((c) => medsNum(c) !== null && c.energyLevel !== null)
      .map((c) => [medsNum(c) as number, c.energyLevel as number])
  );
  const medsVsSleep = pearsonCorrelation(
    patient.checkIns
      .filter((c) => medsNum(c) !== null && c.sleepHours !== null)
      .map((c) => [medsNum(c) as number, c.sleepHours as number])
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

  const phq9Series = responsesAsc
    .filter((r) => r.questionnaire.code === PHQ9_CODE)
    .map((r) => ({ date: formatShortDate(r.completedAt), score: r.score }));

  const ymrsSeries = responsesAsc
    .filter((r) => r.questionnaire.code === YMRS_CODE)
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
      <div className="page-header">
        <h2>{patient.name}</h2>
        <div className="page-header-actions">
          <Link
            href={`/dashboard/patients/${patient.id}/export`}
            target="_blank"
            className="link-btn"
          >
            Выгрузить карту
          </Link>
          {patient.careLinks[0] && (
            <DoctorUnlinkPatient linkId={patient.careLinks[0].id} patientName={patient.name} />
          )}
        </div>
      </div>
      {damLine && (
        <p className="hint" style={{ marginTop: -6 }}>
          {damLine}
        </p>
      )}

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
              Корреляция рассчитана по самоотчётам пациента и носит описательный характер: она не доказывает
              причинно-следственную связь и не заменяет клиническую оценку.
            </p>
          </div>
        )}
      </div>

      {insights.length > 0 && (
        <div className="panel">
          <h3>Выводы по данным</h3>
          <ul className="correlation-list">
            {insights.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
          <p className="hint">
            Это описательные наблюдения по самоотчётам пациента за последние одну-две недели, не диагноз и
            не замена клинической оценке.
          </p>
        </div>
      )}

      <div className="panel">
        <h3>Анамнез</h3>
        <EditAnamnesis
          patientId={patient.id}
          anamnesis={patient.anamnesis}
          birthDate={patient.birthDate ? patient.birthDate.toISOString().slice(0, 10) : null}
          readOnly={licenseInactive}
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
        {!licenseInactive && <AddEncounter patientId={patient.id} />}

        {plannedEncounters.length > 0 && (
          <>
            <h4 className="chart-subtitle" style={{ marginTop: 16 }}>Запланировано</h4>
            <PlannedEncounters
              patientId={patient.id}
              items={plannedEncounters.map((e) => ({
                id: e.id,
                date: e.date.toISOString(),
                type: e.type,
                overdue: e.date.getTime() < startOfToday.getTime(),
              }))}
            />
          </>
        )}

        {doneEncounters.length === 0 ? (
          <p className="empty" style={{ marginTop: 12 }}>Записей пока нет</p>
        ) : (
          <ul className="encounter-list">
            {doneEncounters.map((e) => (
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

      {(beckSeries.length > 0 ||
        mdqSeries.length > 0 ||
        phq9Series.length > 0 ||
        ymrsSeries.length > 0 ||
        cognitiveCategorySeries.length > 0) && (
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
          {phq9Series.length > 0 && (
            <div className="chart-block">
              <h4 className="chart-subtitle">PHQ-9 (депрессия)</h4>
              <QuestionnaireScoreChart
                data={phq9Series}
                domain={[0, QUESTIONNAIRE_MAX_SCORE[PHQ9_CODE]]}
                thresholds={[4, 9, 14, 19]}
                color="#4f6bfe"
              />
              {phq9Series.length < 2 && (
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
          {ymrsSeries.length > 0 && (
            <div className="chart-block">
              <h4 className="chart-subtitle">YMRS (подъём настроения)</h4>
              <QuestionnaireScoreChart
                data={ymrsSeries}
                domain={[0, QUESTIONNAIRE_MAX_SCORE[YMRS_CODE]]}
                thresholds={[7, 14, 25]}
                color="#e0607a"
              />
              {ymrsSeries.length < 2 && (
                <p className="hint">Динамика появится после повторного прохождения опросника.</p>
              )}
            </div>
          )}
          {cognitiveCategorySeries.length > 0 && (
            <div className="chart-block">
              <h4 className="chart-subtitle">Когнитивный тест: по категориям</h4>
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
          <h3>Когнитивный тест: последний результат</h3>
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
        {!licenseInactive && <PrescribeMedication patientId={patient.id} />}
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
                      с {new Date(m.startedAt).toLocaleDateString("ru-RU")}
                      {m.endedAt ? ` по ${new Date(m.endedAt).toLocaleDateString("ru-RU")}` : ", по настоящее время"}
                    </span>
                    {" · "}
                    {PRESCRIBER_LABEL[m.prescriberType] ?? m.prescriberType}
                    {m.prescriberDoctor && ` (${m.prescriberDoctor.name})`}
                    {m.reason && ` · ${m.reason}`}
                  </p>
                  {m.status !== "active" && m.stopReason && (
                    <p className="encounter-field">
                      <span className="encounter-field-label">Причина отмены:</span> {m.stopReason}
                    </p>
                  )}
                  {!licenseInactive && (
                    <DoctorMedControls patientId={patient.id} medId={m.id} status={m.status} />
                  )}
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
                          переносимость {r.tolerability ?? "?"}/5, польза {r.perceivedBenefit ?? "?"}/5
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
            {patient.thoughts.map((t) => {
              const ems = emotionLabels(parseEmotions(t.emotions));
              return (
                <li key={t.id}>
                  <span className="thought-date">
                    {new Date(t.createdAt).toLocaleDateString("ru-RU")}
                  </span>
                  {t.kind === "guided" ? (
                    <div className="thought-guided">
                      {t.situation && (
                        <p>
                          <em>Ситуация:</em> {t.situation}
                        </p>
                      )}
                      {t.content && (
                        <p>
                          <em>Мысль:</em> {t.content}
                        </p>
                      )}
                      {t.reframe && (
                        <p>
                          <em>Другой взгляд:</em> {t.reframe}
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="thought-body">{t.content}</p>
                  )}
                  {ems.length > 0 && (
                    <p className="thought-emotions">
                      {ems.join(", ")}
                      {t.intensity != null && ` · ${t.intensity}/10`}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
