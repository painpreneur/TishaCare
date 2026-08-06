import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma, BECK_CODE, MDQ_CODE, interpretBeck, MdqResult } from "@mindsteady/db";
import { getCurrentDoctor } from "@/lib/session";
import MoodChart from "@/components/MoodChart";

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

  const chartData = patient.checkIns.map((c) => ({
    date: new Date(c.date).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" }),
    mood: c.mood,
  }));

  return (
    <div className="page">
      <Link href="/dashboard" className="back-link">
        ← Все пациенты
      </Link>
      <h2>{patient.name}</h2>

      <div className="panel">
        <h3>Динамика настроения</h3>
        <MoodChart data={chartData} />
      </div>

      <div className="panel">
        <h3>Анамнез</h3>
        <p className="anamnesis">{patient.anamnesis || "Нет данных"}</p>
        <p className="empty" style={{ marginTop: 8 }}>
          Код приглашения для Telegram-бота: <strong>{patient.inviteCode}</strong> —{" "}
          {patient.telegramId ? "бот подключён" : "пациент ещё не подключился"}
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
                  <td>{r.score}</td>
                  <td>{describeResponse(r.questionnaire.code, r.score, r.answers)}</td>
                  <td>{new Date(r.completedAt).toLocaleDateString("ru-RU")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

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
