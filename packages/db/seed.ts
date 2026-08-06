import bcrypt from "bcryptjs";
import { prisma } from "./index";
import { BECK_CODE, MDQ_CODE, interpretMdq, mdqScore } from "./clinical";

function randomCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

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

  const patients = await Promise.all(
    ["Иван Петров", "Мария Кузнецова"].map((name) =>
      prisma.patient.create({
        data: {
          clinicId: clinic.id,
          doctorId: doctor.id,
          name,
          inviteCode: randomCode(),
          anamnesis: "Диагноз БАР II типа, наблюдение с 2023 года.",
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

    await prisma.questionnaireResponse.create({
      data: {
        patientId: patient.id,
        questionnaireId: beck.id,
        score: 12,
        answers: JSON.stringify(Array(21).fill(1)),
      },
    });

    const mdqResult = interpretMdq(Array(13).fill(false).fill(true, 0, 8), true, 2);
    await prisma.questionnaireResponse.create({
      data: {
        patientId: patient.id,
        questionnaireId: mdq.id,
        score: mdqScore(mdqResult),
        answers: JSON.stringify(mdqResult),
      },
    });

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

  console.log("Seed complete.");
  console.log(`Doctor login: doctor@demo.local / demo1234`);
  console.log(
    `Patient invite codes: ${patients.map((p) => `${p.name} -> ${p.inviteCode}`).join(", ")}`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
