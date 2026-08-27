import bcrypt from "bcryptjs";
import { prisma } from "./index";
import { BECK_CODE, MDQ_CODE, interpretMdq, mdqScore } from "./clinical";
import { generateInviteCode } from "./invite";
import {
  COGNITIVE_TEST_CODE,
  COGNITIVE_TEST_TITLE,
  MEMORY_WORD_LIST,
  interpretCognitiveTest,
  cognitiveTestScore,
  type CognitiveTestSubmission,
} from "./cognitive";

export const DEV_FIXTURE_TELEGRAM_ID = "1000000001";

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
      email: "doctor@demo.local",
      passwordHash: await bcrypt.hash("demo1234", 10),
      name: "Анна Смирнова",
    },
  });

  // Solo practitioner (no clinic) — exercises the practiceType = "solo" path.
  await prisma.doctor.create({
    data: {
      practiceType: "solo",
      email: "solo@demo.local",
      passwordHash: await bcrypt.hash("demo1234", 10),
      name: "Дмитрий Волков",
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

  const patientSeeds = [
    { name: "Иван Петров", birthDate: new Date(Date.UTC(1988, 2, 14)) },
    { name: "Мария Кузнецова", birthDate: new Date(Date.UTC(1995, 10, 2)) },
  ];
  const patients = await Promise.all(
    patientSeeds.map(({ name, birthDate }, i) =>
      prisma.patient.create({
        data: {
          clinicId: clinic.id,
          doctorId: doctor.id,
          name,
          birthDate,
          inviteCode: generateInviteCode(),
          anamnesis: "Диагноз БАР II типа, наблюдение с 2023 года.",
          // Первому демо-пациенту присваиваем фиксированный telegramId, чтобы
          // Mini App можно было тестировать в браузере через dev-bypass
          // (см. apps/web/lib/telegramAuth.ts), без реальной сессии Telegram.
          telegramId: i === 0 ? DEV_FIXTURE_TELEGRAM_ID : undefined,
        },
      })
    )
  );

  for (const patient of patients) {
    const checkIns = Array.from({ length: 14 }).map((_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (13 - i));
      return prisma.checkIn.create({
        data: {
          patientId: patient.id,
          date,
          mood: Math.floor(Math.random() * 5) - 2,
          sleepHours: 5 + Math.random() * 4,
          energyLevel: Math.floor(Math.random() * 5) + 1,
          medsTaken: Math.random() > 0.15,
        },
      });
    });
    await Promise.all(checkIns);

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

    await prisma.medication.create({
      data: {
        patientId: patient.id,
        name: "Кветиапин",
        dosage: "200 мг",
        frequency: 2,
      },
    });

    await prisma.thought.create({
      data: {
        patientId: patient.id,
        content: "Сегодня было тяжело сосредоточиться на работе, но настроение ровное.",
      },
    });
  }

  const unclaimedPatient = await prisma.patient.create({
    data: {
      name: "Пётр Сидоров",
      inviteCode: generateInviteCode(),
    },
  });

  console.log("Seed complete.");
  console.log(`Doctor login (clinic): doctor@demo.local / demo1234`);
  console.log(`Doctor login (solo):   solo@demo.local / demo1234`);
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
