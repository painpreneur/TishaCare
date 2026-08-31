import { notFound } from "next/navigation";
import { prisma, COGNITIVE_TEST_CODE, CognitiveTestInterpretation } from "@tishacare/db";
import { getCurrentDoctor } from "@/lib/session";
import { patientAccessWhere } from "@/lib/patientAccess";
import { describeResponse, QUESTIONNAIRE_MAX_SCORE } from "@/lib/questionnaireInterpret";
import { summarizeCheckIns, moodWord } from "@/lib/patientRecord";
import { buildPatientInsights } from "@/lib/insights";
import { ENCOUNTER_FIELDS, ENCOUNTER_FIELD_LABEL, ENCOUNTER_TYPE_LABEL } from "@/lib/encounter";
import { MED_STATUS_LABEL, PRESCRIBER_LABEL, tagsToLabels } from "@/lib/medication";
import { parseEmotions, emotionLabels } from "@/lib/thoughts";
import PatientRecordToolbar from "@/components/PatientRecordToolbar";

export const metadata = { title: "Карта пациента" };

const fullDate = (d: Date | string) => new Date(d).toLocaleDateString("ru-RU");
const dateTime = (d: Date | string) =>
  new Date(d).toLocaleString("ru-RU", { dateStyle: "long", timeStyle: "short" });

function ageYears(birth: Date): number {
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
  return age;
}

export default async function PatientRecordExportPage({ params }: { params: { id: string } }) {
  const doctor = await getCurrentDoctor();
  if (!doctor) notFound();

  const patient = await prisma.patient.findFirst({
    where: { id: params.id, ...patientAccessWhere(doctor) },
    include: {
      checkIns: { orderBy: { date: "asc" } },
      responses: { include: { questionnaire: true }, orderBy: { completedAt: "asc" } },
      medications: {
        orderBy: [{ status: "asc" }, { startedAt: "desc" }],
        include: {
          reports: { orderBy: { date: "desc" } },
          prescriberDoctor: { select: { name: true } },
        },
      },
      thoughts: { orderBy: { createdAt: "desc" } },
      encounters: { include: { doctor: { select: { name: true } } }, orderBy: { date: "asc" } },
    },
  });

  if (!patient) notFound();

  const summary = summarizeCheckIns(patient.checkIns);
  const insights = buildPatientInsights(patient.checkIns, patient.responses);

  const cognitiveResponse = [...patient.responses]
    .reverse()
    .find((r) => r.questionnaire.code === COGNITIVE_TEST_CODE);
  let cognitive: CognitiveTestInterpretation | null = null;
  if (cognitiveResponse) {
    try {
      cognitive = (
        JSON.parse(cognitiveResponse.answers) as { interpretation: CognitiveTestInterpretation }
      ).interpretation;
    } catch {
      cognitive = null;
    }
  }

  return (
    <div className="record-export">
      <PatientRecordToolbar backHref={`/dashboard/patients/${patient.id}`} csvHref={`/dashboard/patients/${patient.id}/export.csv`} />

      <header className="record-head">
        <h1>Медицинская карта пациента</h1>
        <table className="record-meta">
          <tbody>
            <tr>
              <th>Пациент</th>
              <td>{patient.name}</td>
            </tr>
            {patient.birthDate && (
              <tr>
                <th>Дата рождения</th>
                <td>
                  {fullDate(patient.birthDate)} ({ageYears(patient.birthDate)} лет)
                </td>
              </tr>
            )}
            <tr>
              <th>Лечащий врач</th>
              <td>
                {doctor.name}
                {doctor.clinic?.name ? `, ${doctor.clinic.name}` : ""}
              </td>
            </tr>
            <tr>
              <th>Выгрузка сформирована</th>
              <td>{dateTime(new Date())}</td>
            </tr>
          </tbody>
        </table>
      </header>

      <section className="record-section">
        <h2>Анамнез</h2>
        {patient.anamnesis ? (
          <p className="record-text">{patient.anamnesis}</p>
        ) : (
          <p className="record-empty">Не заполнен</p>
        )}
        {patient.anamnesisUpdatedAt && (
          <p className="record-note">Обновлён {fullDate(patient.anamnesisUpdatedAt)}</p>
        )}
      </section>

      <section className="record-section">
        <h2>Сводка наблюдений пациента</h2>
        {summary.count === 0 ? (
          <p className="record-empty">Отметок о состоянии пока нет</p>
        ) : (
          <>
            <table className="record-table">
              <tbody>
                <tr>
                  <th>Отметок о состоянии</th>
                  <td>{summary.count}</td>
                </tr>
                <tr>
                  <th>Период</th>
                  <td>
                    {fullDate(summary.firstDate!)} — {fullDate(summary.lastDate!)}
                  </td>
                </tr>
                <tr>
                  <th>Среднее настроение</th>
                  <td>
                    {/* `|| 0` folds -0.0 into 0.0 */}
                    {(Math.round(summary.avgMood! * 10) / 10 || 0).toFixed(1)} по шкале −2…+2
                    {moodWord(summary.avgMood) ? ` (${moodWord(summary.avgMood)})` : ""}
                  </td>
                </tr>
                {summary.avgEnergy != null && (
                  <tr>
                    <th>Средняя энергия</th>
                    <td>{summary.avgEnergy.toFixed(1)} по шкале 1…5</td>
                  </tr>
                )}
                {summary.avgSleep != null && (
                  <tr>
                    <th>Средний сон</th>
                    <td>{summary.avgSleep.toFixed(1)} ч</td>
                  </tr>
                )}
                {summary.adherencePct != null && (
                  <tr>
                    <th>Приём препаратов по самоотчёту</th>
                    <td>
                      {summary.adherencePct}% отметок «принял» (из {summary.answeredMeds} с ответом)
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            {insights.length > 0 && (
              <>
                <h3>Выводы по данным</h3>
                <ul className="record-list">
                  {insights.map((line, i) => (
                    <li key={i}>{line}</li>
                  ))}
                </ul>
                <p className="record-note">
                  Описательные наблюдения по самоотчётам пациента за последние одну-две недели, не
                  диагноз и не замена клинической оценке.
                </p>
              </>
            )}
          </>
        )}
      </section>

      <section className="record-section">
        <h2>Приёмы и встречи</h2>
        {patient.encounters.length === 0 ? (
          <p className="record-empty">Записей нет</p>
        ) : (
          <ul className="record-entries">
            {patient.encounters.map((e) => (
              <li key={e.id}>
                <p className="record-entry-head">
                  <strong>
                    {ENCOUNTER_TYPE_LABEL[e.type as keyof typeof ENCOUNTER_TYPE_LABEL] ?? e.type}
                  </strong>{" "}
                  · {fullDate(e.date)} · {e.doctor.name}
                </p>
                {ENCOUNTER_FIELDS.map((f) =>
                  e[f] ? (
                    <p key={f} className="record-field">
                      <span className="record-field-label">{ENCOUNTER_FIELD_LABEL[f]}:</span> {e[f]}
                    </p>
                  ) : null,
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="record-section">
        <h2>Медикаменты</h2>
        {patient.medications.length === 0 ? (
          <p className="record-empty">Не назначены</p>
        ) : (
          <ul className="record-entries">
            {patient.medications.map((m) => (
              <li key={m.id}>
                <p className="record-entry-head">
                  <strong>
                    {m.name}, {m.dosage}, {m.frequency} раз/день
                  </strong>{" "}
                  · {MED_STATUS_LABEL[m.status as keyof typeof MED_STATUS_LABEL] ?? m.status}
                </p>
                <p className="record-field">
                  с {fullDate(m.startedAt)}
                  {m.endedAt ? ` по ${fullDate(m.endedAt)}` : ", по настоящее время"} ·{" "}
                  {PRESCRIBER_LABEL[m.prescriberType] ?? m.prescriberType}
                  {m.prescriberDoctor ? ` (${m.prescriberDoctor.name})` : ""}
                  {m.reason ? ` · ${m.reason}` : ""}
                </p>
                {m.status !== "active" && m.stopReason && (
                  <p className="record-field">
                    <span className="record-field-label">Причина отмены:</span> {m.stopReason}
                  </p>
                )}
                {m.reports.length > 0 && (
                  <div className="record-subentries">
                    {m.reports.map((r) => (
                      <p key={r.id} className="record-field">
                        <span className="record-field-label">{fullDate(r.date)}:</span> переносимость{" "}
                        {r.tolerability ?? "?"}/5, польза {r.perceivedBenefit ?? "?"}/5
                        {tagsToLabels(r.sideEffectTags).length > 0 &&
                          ` · ${tagsToLabels(r.sideEffectTags).join(", ")}`}
                        {r.sideEffects ? ` · ${r.sideEffects}` : ""}
                        {r.note ? ` · ${r.note}` : ""}
                      </p>
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="record-section">
        <h2>Результаты опросников</h2>
        {patient.responses.length === 0 ? (
          <p className="record-empty">Опросники не проходились</p>
        ) : (
          <table className="record-table cols">
            <thead>
              <tr>
                <th>Дата</th>
                <th>Опросник</th>
                <th>Балл</th>
                <th>Интерпретация</th>
              </tr>
            </thead>
            <tbody>
              {patient.responses.map((r) => (
                <tr key={r.id}>
                  <td>{fullDate(r.completedAt)}</td>
                  <td>{r.questionnaire.title}</td>
                  <td>
                    {r.score}
                    {QUESTIONNAIRE_MAX_SCORE[r.questionnaire.code] != null &&
                      ` / ${QUESTIONNAIRE_MAX_SCORE[r.questionnaire.code]}`}
                  </td>
                  <td>{describeResponse(r.questionnaire.code, r.score, r.answers)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {cognitive && (
        <section className="record-section">
          <h2>Когнитивный тест: последний результат</h2>
          <p className="record-note" style={{ marginTop: 0 }}>
            {cognitiveResponse && `Пройден ${fullDate(cognitiveResponse.completedAt)}. `}
            {cognitive.summary}
          </p>
          <table className="record-table cols">
            <thead>
              <tr>
                <th>Категория</th>
                <th>Балл</th>
                <th>Уровень</th>
              </tr>
            </thead>
            <tbody>
              {cognitive.categories.map((c) => (
                <tr key={c.category}>
                  <td>{c.label}</td>
                  <td>
                    {c.raw}/{c.max}
                  </td>
                  <td>{c.level}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="record-note">{cognitive.disclaimer}</p>
        </section>
      )}

      <section className="record-section">
        <h2>Дневник мыслей</h2>
        {patient.thoughts.length === 0 ? (
          <p className="record-empty">Записей нет</p>
        ) : (
          <ul className="record-entries">
            {patient.thoughts.map((t) => {
              const ems = emotionLabels(parseEmotions(t.emotions));
              return (
                <li key={t.id}>
                  <p className="record-entry-head">{fullDate(t.createdAt)}</p>
                  {t.kind === "guided" ? (
                    <>
                      {t.situation && (
                        <p className="record-field">
                          <span className="record-field-label">Ситуация:</span> {t.situation}
                        </p>
                      )}
                      {t.content && (
                        <p className="record-field">
                          <span className="record-field-label">Мысль:</span> {t.content}
                        </p>
                      )}
                      {t.reframe && (
                        <p className="record-field">
                          <span className="record-field-label">Другой взгляд:</span> {t.reframe}
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="record-field">{t.content}</p>
                  )}
                  {ems.length > 0 && (
                    <p className="record-field">
                      <span className="record-field-label">Эмоции:</span> {ems.join(", ")}
                      {t.intensity != null ? ` · ${t.intensity}/10` : ""}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <footer className="record-foot no-print">
        <PatientRecordToolbar backHref={`/dashboard/patients/${patient.id}`} csvHref={`/dashboard/patients/${patient.id}/export.csv`} />
      </footer>
    </div>
  );
}
