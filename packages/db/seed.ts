import bcrypt from "bcryptjs";
import { prisma } from "./index";
import { BECK_CODE, MDQ_CODE, interpretMdq, mdqScore } from "./clinical";
import { BALANCE_WHEEL_CODE, BALANCE_WHEEL_TITLE, interpretBalanceWheel } from "./lifeBalance";
import { generateInviteCode, generateConnectCode } from "./invite";
import {
  COGNITIVE_TEST_CODE,
  COGNITIVE_TEST_TITLE,
  MEMORY_WORD_LIST,
  interpretCognitiveTest,
  cognitiveTestScore,
  type CognitiveTestSubmission,
} from "./cognitive";

export const DEV_FIXTURE_TELEGRAM_ID = "1000000001";

// A2 backfill: freeze the "Плотина Тиши" milestone timeline for demo patients so
// /progress is not empty on a fresh seed. Mirrors the stage gates in
// apps/web/lib/gamification.ts — KEEP IN SYNC. Each PatientMilestone.reachedAt is
// the day the patient's Nth qualifying entry first cleared both gates (cumulative
// entries AND days since the first entry), not "now".
const MS_DAY = 24 * 60 * 60 * 1000;
const MILESTONE_GATES = [
  { stage: 1, entries: 1, days: 0 },
  { stage: 2, entries: 7, days: 7 },
  { stage: 3, entries: 25, days: 30 },
  { stage: 4, entries: 60, days: 90 },
  { stage: 5, entries: 120, days: 180 },
  { stage: 6, entries: 0, days: 365 },
];

async function backfillMilestones(patientId: string) {
  const [checkIns, responses, medReports] = await Promise.all([
    prisma.checkIn.findMany({ where: { patientId }, select: { date: true } }),
    prisma.questionnaireResponse.findMany({ where: { patientId }, select: { completedAt: true } }),
    prisma.medicationReport.findMany({ where: { patientId }, select: { date: true } }),
  ]);
  const times = [
    ...checkIns.map((c) => c.date.getTime()),
    ...responses.map((r) => r.completedAt.getTime()),
    ...medReports.map((m) => m.date.getTime()),
  ].sort((a, b) => a - b);
  if (!times.length) return;

  // Earliest timestamp on each distinct UTC day, in order (max one entry / day).
  const dayFirstTs = new Map<string, number>();
  for (const t of times) {
    const key = new Date(t).toISOString().slice(0, 10);
    if (!dayFirstTs.has(key)) dayFirstTs.set(key, t);
  }
  const days = [...dayFirstTs.values()];
  const firstTs = days[0];

  const rows: { patientId: string; stage: number; reachedAt: Date }[] = [];
  for (const gate of MILESTONE_GATES) {
    let reachedAt: number | null = null;
    for (let i = 0; i < days.length; i++) {
      const count = i + 1;
      const elapsedDays = Math.floor((days[i] - firstTs) / MS_DAY);
      if (count >= gate.entries && elapsedDays >= gate.days) {
        reachedAt = days[i];
        break;
      }
    }
    // Stage 6 is time-only: reachable purely by elapsed time since the first
    // entry. Not expected in demo data; handled so the rule stays honest.
    if (reachedAt == null && gate.entries === 0) {
      const t = firstTs + gate.days * MS_DAY;
      if (t <= Date.now()) reachedAt = t;
    }
    if (reachedAt != null) rows.push({ patientId, stage: gate.stage, reachedAt: new Date(reachedAt) });
  }
  if (rows.length) await prisma.patientMilestone.createMany({ data: rows });
  return rows.map((r) => r.stage);
}

// Backfill "Открытия" for demo patients so the /progress section is not empty.
// Mirrors apps/web/lib/unlocks.ts — KEEP IN SYNC. Triggers are acts only.
const INTAKE_CODES = ["MDQ", "GAD7", "ASRS_A", "AQ10", "MSI_BPD"];
const SCALE_CODES = new Set(["BECK21", "GAD7", "ASRS_A", "AQ10", "MSI_BPD", "MDQ"]);

async function backfillUnlocks(patientId: string, damStage: number) {
  const [checkIns, responses, medReports] = await Promise.all([
    prisma.checkIn.findMany({ where: { patientId }, select: { date: true } }),
    prisma.questionnaireResponse.findMany({
      where: { patientId },
      select: { completedAt: true, questionnaire: { select: { code: true } } },
    }),
    prisma.medicationReport.findMany({ where: { patientId }, select: { date: true } }),
  ]);

  const times = [
    ...checkIns.map((c) => c.date.getTime()),
    ...responses.map((r) => r.completedAt.getTime()),
    ...medReports.map((m) => m.date.getTime()),
  ];
  const days = new Set(times.map((t) => new Date(t).toISOString().slice(0, 10)));
  const entryCount = days.size;
  const daysActive = times.length ? Math.floor((Date.now() - Math.min(...times)) / MS_DAY) : 0;
  const codes = responses.map((r) => r.questionnaire.code);
  const completed = new Set(codes);
  const scaleCount = codes.filter((c) => SCALE_CODES.has(c)).length;

  const earned: string[] = [];
  if (entryCount >= 7) earned.push("connections");
  if (completed.has("BALANCE_WHEEL")) earned.push("balance");
  if (scaleCount >= 5) earned.push("compare");
  if (INTAKE_CODES.every((c) => completed.has(c))) earned.push("baseline");
  if (entryCount >= 30) earned.push("rhythm");
  if (daysActive >= 365) earned.push("year");
  if (damStage >= 3) earned.push("seasons");

  if (earned.length) await prisma.patientUnlock.createMany({ data: earned.map((code) => ({ patientId, code })) });
  return earned;
}

const demoCognitiveSubmission: CognitiveTestSubmission = {
  memoryImmediate: { selected: MEMORY_WORD_LIST.slice(0, 7), correctCount: 7 },
  attentionSerialSevens: { entered: [55, 48, 41, 34, 27], correctCount: 5 },
  attentionSchulte: { totalTimeMs: 42000, errors: 0 },
  thinkingAnalogies: { correctCount: 4, total: 5 },
  spatial: { correctCount: 2, total: 2 },
  verbalFluency: { letter: "К", words: ["кот", "книга", "конь", "клён", "капля", "крыло"], count: 6 },
  regulation: { totalTargets: 5, hits: 4, falseAlarms: 1, misses: 1, avgReactionMs: 480 },
  psychState: { order: ["blue", "green", "red", "yellow", "violet", "grey", "brown", "black"] },
  memoryDelayed: { selected: MEMORY_WORD_LIST.slice(0, 5), correctCount: 5 },
};

async function main() {
  const clinic = await prisma.clinic.create({
    data: { name: "Клиника «Ремиссия»" },
  });

  const doctor = await prisma.doctor.create({
    data: {
      clinicId: clinic.id,
      role: "admin",
      email: "doctor@demo.local",
      passwordHash: await bcrypt.hash("demo1234", 10),
      name: "Анна Смирнова",
      connectCode: "DEMO01",
    },
  });

  // Second doctor in the same clinic, a plain member — exercises the clinic
  // management screen and the member role.
  await prisma.doctor.create({
    data: {
      clinicId: clinic.id,
      role: "member",
      email: "member@demo.local",
      passwordHash: await bcrypt.hash("demo1234", 10),
      name: "Ольга Лебедева",
      connectCode: generateConnectCode(),
    },
  });

  // Solo practitioner (no clinic) — exercises the practiceType = "solo" path.
  await prisma.doctor.create({
    data: {
      practiceType: "solo",
      email: "solo@demo.local",
      passwordHash: await bcrypt.hash("demo1234", 10),
      name: "Дмитрий Волков",
      connectCode: generateConnectCode(),
    },
  });

  const beck = await prisma.questionnaire.create({
    data: {
      code: BECK_CODE,
      title: "Опросник депрессии Бека",
      description: "Скрининг выраженности депрессивной симптоматики (21 вопрос)",
    },
  });

  const mdq = await prisma.questionnaire.create({
    data: {
      code: MDQ_CODE,
      title: "MDQ (Mood Disorder Questionnaire)",
      description: "Скрининг расстройств биполярного спектра",
    },
  });

  const cognitive = await prisma.questionnaire.create({
    data: {
      code: COGNITIVE_TEST_CODE,
      title: COGNITIVE_TEST_TITLE,
      description: "Патопсихологический скрининг: память, внимание, мышление, речь и др.",
    },
  });

  const balanceWheel = await prisma.questionnaire.create({
    data: {
      code: BALANCE_WHEEL_CODE,
      title: BALANCE_WHEEL_TITLE,
      description: "Самоанализ удовлетворённости по восьми сферам жизни",
    },
  });

  const demoPatientPasswordHash = await bcrypt.hash("demo1234", 10);
  const patientSeeds = [
    {
      name: "Иван Петров",
      birthDate: new Date(Date.UTC(1988, 2, 14)),
      // Both auth methods on one row: Telegram (dev-bypass fixture id) and an
      // email/password for the web portal (/app).
      email: "patient@demo.local",
      passwordHash: demoPatientPasswordHash,
    },
    { name: "Мария Кузнецова", birthDate: new Date(Date.UTC(1995, 10, 2)), email: undefined, passwordHash: undefined },
  ];
  const patients = await Promise.all(
    patientSeeds.map(({ name, birthDate, email, passwordHash }, i) =>
      prisma.patient.create({
        data: {
          clinicId: clinic.id,
          name,
          birthDate,
          email,
          passwordHash,
          inviteCode: generateInviteCode(),
          anamnesis: "Диагноз БАР II типа, наблюдение с 2023 года.",
          // Первому демо-пациенту присваиваем фиксированный telegramId, чтобы
          // Mini App можно было тестировать в браузере через dev-bypass
          // (см. apps/web/lib/telegramAuth.ts), без реальной сессии Telegram.
          telegramId: i === 0 ? DEV_FIXTURE_TELEGRAM_ID : undefined,
          // Connected demo patients have already been through onboarding — set
          // consent so write endpoints (resolveConsentedPatient) work in dev.
          // Keep in sync with apps/web/lib/consent.ts CONSENT_VERSION.
          consentAt: new Date(),
          consentVersion: "2026-08-27",
          // First demo patient opts into the daily med-intake nudge.
          medReminderEnabled: i === 0,
        },
      })
    )
  );

  // Active CareLink for each connected patient (mirrors the legacy doctorId
  // until the doctor read paths move onto CareLink).
  await Promise.all(
    patients.map((patient) =>
      prisma.careLink.create({
        data: {
          patientId: patient.id,
          doctorId: doctor.id,
          status: "active",
          requestedBy: "doctor",
          activatedAt: new Date(),
        },
      })
    )
  );

  const TAG_POOL = ["calm", "anxious", "activated", "slowed", "irritable", "mixed"];
  for (const [pIndex, patient] of patients.entries()) {
    const checkInOps = [];
    for (let i = 0; i < 14; i++) {
      const day = new Date();
      day.setDate(day.getDate() - (13 - i));

      // A morning "moment" entry, and on most days an evening one too, so the
      // per-entry dots and within-day spread show on the chart.
      const entriesToday = Math.random() > 0.3 ? 2 : 1;
      for (let e = 0; e < entriesToday; e++) {
        const date = new Date(day);
        date.setHours(e === 0 ? 9 : 21, Math.floor(Math.random() * 50));
        const tags = Math.random() > 0.5 ? [TAG_POOL[Math.floor(Math.random() * TAG_POOL.length)]] : [];
        checkInOps.push(
          prisma.checkIn.create({
            data: {
              patientId: patient.id,
              date,
              mood: Math.floor(Math.random() * 5) - 2,
              stateTags: tags.length ? JSON.stringify(tags) : null,
              note: e === 1 && Math.random() > 0.6 ? "вечером тяжелее, много мыслей" : null,
              // Sleep and meds ride on the first (morning) entry of the day.
              sleepHours: e === 0 ? 5 + Math.random() * 4 : null,
              energyLevel: Math.floor(Math.random() * 5) + 1,
              medsStatus: e === 0 ? (Math.random() > 0.15 ? "yes" : Math.random() > 0.5 ? "partial" : "no") : null,
            },
          })
        );
      }
    }
    await Promise.all(checkInOps);

    // Первому демо-пациенту добавляем длинную предысторию (одна запись в день,
    // примерно за 3 месяца до недавних 14 дней), чтобы на /progress была видна
    // непустая лента вех ("Плотина Тиши"). Иногда день пропускаем: лента при
    // этом замирает, а не откатывается. Свежие 14 дней выше не трогаем, там
    // детализация точек на графике.
    if (pIndex === 0) {
      const historyOps = [];
      for (let d = 95; d > 14; d--) {
        if (Math.random() < 0.15) continue;
        const date = new Date();
        date.setDate(date.getDate() - d);
        date.setHours(9 + Math.floor(Math.random() * 10), Math.floor(Math.random() * 50));
        historyOps.push(
          prisma.checkIn.create({
            data: {
              patientId: patient.id,
              date,
              mood: Math.floor(Math.random() * 5) - 2,
              stateTags:
                Math.random() > 0.6
                  ? JSON.stringify([TAG_POOL[Math.floor(Math.random() * TAG_POOL.length)]])
                  : null,
              sleepHours: 5 + Math.random() * 4,
              energyLevel: Math.floor(Math.random() * 5) + 1,
              medsStatus: Math.random() > 0.15 ? "yes" : "partial",
            },
          })
        );
      }
      await Promise.all(historyOps);
    }

    // Несколько прошлых прохождений каждого опросника (по убыванию давности),
    // чтобы на панели "Динамика по шкалам" сразу было видно изменение баллов.
    const beckScoresOverTime = [22, 18, 15, 12];
    for (const [i, score] of beckScoresOverTime.entries()) {
      const completedAt = new Date();
      completedAt.setDate(completedAt.getDate() - (beckScoresOverTime.length - 1 - i) * 14);
      await prisma.questionnaireResponse.create({
        data: {
          patientId: patient.id,
          questionnaireId: beck.id,
          score,
          answers: JSON.stringify(Array(21).fill(1)),
          completedAt,
        },
      });
    }

    const mdqYesCountsOverTime = [9, 8, 8, 8];
    for (const [i, yesCount] of mdqYesCountsOverTime.entries()) {
      const mdqResult = interpretMdq(Array(13).fill(false).fill(true, 0, yesCount), true, 2);
      const completedAt = new Date();
      completedAt.setDate(completedAt.getDate() - (mdqYesCountsOverTime.length - 1 - i) * 14);
      await prisma.questionnaireResponse.create({
        data: {
          patientId: patient.id,
          questionnaireId: mdq.id,
          score: mdqScore(mdqResult),
          answers: JSON.stringify(mdqResult),
          completedAt,
        },
      });
    }

    const cognitiveSubmissionsOverTime: CognitiveTestSubmission[] = [
      {
        ...demoCognitiveSubmission,
        memoryImmediate: { selected: MEMORY_WORD_LIST.slice(0, 4), correctCount: 4 },
        attentionSerialSevens: { entered: [55, 48, 41, 34, 27], correctCount: 3 },
      },
      {
        ...demoCognitiveSubmission,
        memoryImmediate: { selected: MEMORY_WORD_LIST.slice(0, 5), correctCount: 5 },
        attentionSerialSevens: { entered: [55, 48, 41, 34, 27], correctCount: 4 },
      },
      demoCognitiveSubmission,
    ];
    for (const [i, submission] of cognitiveSubmissionsOverTime.entries()) {
      const interpretation = interpretCognitiveTest(submission);
      const completedAt = new Date();
      completedAt.setDate(completedAt.getDate() - (cognitiveSubmissionsOverTime.length - 1 - i) * 21);
      await prisma.questionnaireResponse.create({
        data: {
          patientId: patient.id,
          questionnaireId: cognitive.id,
          score: cognitiveTestScore(interpretation),
          answers: JSON.stringify({ submission, interpretation }),
          completedAt,
        },
      });
    }

    // Колесо баланса — три прохождения с интервалом, чтобы работал разблок
    // "История колеса баланса" и на "Моей динамике" было что сравнивать.
    const balanceRunsOverTime = [
      [4, 6, 5, 7, 3, 5, 6, 8],
      [5, 6, 6, 7, 4, 6, 6, 8],
      [7, 6, 6, 8, 5, 7, 7, 8],
    ];
    for (const [i, values] of balanceRunsOverTime.entries()) {
      const completedAt = new Date();
      completedAt.setDate(completedAt.getDate() - (balanceRunsOverTime.length - 1 - i) * 21);
      await prisma.questionnaireResponse.create({
        data: {
          patientId: patient.id,
          questionnaireId: balanceWheel.id,
          score: values.reduce((s, v) => s + v, 0),
          answers: JSON.stringify({
            submission: values,
            interpretation: interpretBalanceWheel(values),
          }),
          completedAt,
        },
      });
    }

    // A stopped earlier course + the current one, with a patient report.
    const daysAgo = (n: number) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);
    await prisma.medication.create({
      data: {
        patientId: patient.id,
        name: "Ламотриджин",
        dosage: "100 мг",
        frequency: 1,
        status: "switched",
        reason: "Стабилизация настроения",
        prescriberType: "doctor",
        prescriberDoctorId: doctor.id,
        startedAt: daysAgo(120),
        endedAt: daysAgo(40),
      },
    });
    const current = await prisma.medication.create({
      data: {
        patientId: patient.id,
        name: "Кветиапин",
        dosage: "200 мг",
        frequency: 2,
        reason: "Сон и тревога",
        prescriberType: "doctor",
        prescriberDoctorId: doctor.id,
        startedAt: daysAgo(40),
      },
    });
    await prisma.medicationReport.create({
      data: {
        medicationId: current.id,
        patientId: patient.id,
        date: daysAgo(7),
        tolerability: 2,
        perceivedBenefit: 4,
        sideEffects: "Сильная сонливость по утрам, тяжело вставать",
        sideEffectTags: "drowsiness,weight",
        note: "Помогает со сном, но днём разбитость",
      },
    });

    await prisma.thought.create({
      data: {
        patientId: patient.id,
        content: "Сегодня было тяжело сосредоточиться на работе, но настроение ровное.",
        emotions: JSON.stringify(["anxiety"]),
        intensity: 4,
      },
    });
    await prisma.thought.create({
      data: {
        patientId: patient.id,
        kind: "guided",
        situation: "Не ответили на сообщение полдня.",
        content: "Наверное, я сказал(а) что-то не так и на меня обиделись.",
        reframe: "Человек мог просто быть занят. Спрошу напрямую вечером.",
        emotions: JSON.stringify(["anxiety", "shame"]),
        intensity: 7,
      },
    });

    const stages = await backfillMilestones(patient.id);
    console.log(`Milestones for ${patient.name}: ${stages?.join(", ") || "none"}`);

    const unlocks = await backfillUnlocks(patient.id, stages && stages.length ? Math.max(...stages) : 1);
    console.log(`Unlocks for ${patient.name}: ${unlocks.join(", ") || "none"}`);
  }

  const unclaimedPatient = await prisma.patient.create({
    data: {
      name: "Пётр Сидоров",
      inviteCode: generateInviteCode(),
    },
  });

  console.log("Seed complete.");
  console.log(`Doctor login (clinic admin):  doctor@demo.local / demo1234`);
  console.log(`Doctor login (clinic member): member@demo.local / demo1234`);
  console.log(`Doctor login (solo):          solo@demo.local / demo1234`);
  console.log(`Patient web login:     patient@demo.local / demo1234`);
  console.log(
    `Connected patients: ${patients.map((p) => p.name).join(", ")}`
  );
  console.log(
    `Unclaimed patient (test "Подключить пациента"): ${unclaimedPatient.name} -> ${unclaimedPatient.inviteCode}`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
