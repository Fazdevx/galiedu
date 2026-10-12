import "dotenv/config";
import bcrypt from "bcryptjs";
import { prisma } from "../src/lib/prisma";
import { Prisma } from "../src/generated/prisma/client";

async function upsertLevel(name: string, type: "INICIAL" | "PRIMARIA" | "SECUNDARIA" | "ACADEMIA", order: number) {
  const level = await prisma.level.upsert({
    where: { type },
    update: { name, order },
    create: { name, type, order },
  });
  return level;
}

async function upsertGrades(level: { id: string }, names: string[]) {
  for (let i = 0; i < names.length; i++) {
    await prisma.grade.upsert({
      where: { levelId_name: { levelId: level.id, name: names[i] } },
      update: { order: i + 1 },
      create: { levelId: level.id, name: names[i], order: i + 1 },
    });
  }
}

async function seedGradesWithSections(levelType: "INICIAL" | "PRIMARIA" | "SECUNDARIA" | "ACADEMIA", gradeNames: string[], sectionNames: string[]) {
  const level = await prisma.level.findUnique({ where: { type: levelType } });
  if (!level) return;

  const grades = await prisma.grade.findMany({ where: { levelId: level.id } });
  for (const gradeName of gradeNames) {
    let grade = grades.find((g) => g.name === gradeName);
    if (!grade) {
      grade = await prisma.grade.create({
        data: { levelId: level.id, name: gradeName, order: gradeNames.indexOf(gradeName) + 1 },
      });
    }
    for (const sectionName of sectionNames) {
      await prisma.section.upsert({
        where: { gradeId_academicYearId_name: { gradeId: grade.id, academicYearId: activeYear.id, name: sectionName } },
        update: {},
        create: { gradeId: grade.id, academicYearId: activeYear.id, name: sectionName, capacity: 30 },
      });
    }
  }
}

// Cuenta de demostración: idempotente por email, todos con la misma contraseña.
async function upsertDemoUser(name: string, email: string, role: "SUPER_ADMIN" | "ADMIN" | "DIRECTOR" | "COORDINADOR" | "PROFESOR" | "ALUMNO" | "APODERADO") {
  const passwordHash = await bcrypt.hash("galileo123", 10);
  return prisma.user.upsert({
    where: { email },
    update: { role, status: "ACTIVE", passwordHash },
    create: { name, email, role, status: "ACTIVE", passwordHash },
  });
}

const activeYear = { id: "" };

async function main() {
  // Año académico vigente
  activeYear.id = (
    await prisma.academicYear.upsert({
      where: { year: 2025 },
      update: { isActive: true },
      create: { year: 2025, name: "Año académico 2025", isActive: true },
    })
  ).id;

  // Niveles
  const inicial = await upsertLevel("Educación Inicial", "INICIAL", 1);
  await upsertGrades(inicial, ["3 años", "4 años", "5 años"]);

  const primaria = await upsertLevel("Educación Primaria", "PRIMARIA", 2);
  await upsertGrades(primaria, ["1° de Primaria", "2° de Primaria", "3° de Primaria", "4° de Primaria", "5° de Primaria", "6° de Primaria"]);

  const secundaria = await upsertLevel("Educación Secundaria", "SECUNDARIA", 3);
  await upsertGrades(secundaria, ["1° de Secundaria", "2° de Secundaria", "3° de Secundaria", "4° de Secundaria", "5° de Secundaria"]);

  const academia = await upsertLevel("Academia Galileo", "ACADEMIA", 4);
  await upsertGrades(academia, ["Academia General"]);

  // Secciones por nivel
  await seedGradesWithSections("INICIAL", ["3 años", "4 años", "5 años"], ["A", "B"]);
  await seedGradesWithSections("PRIMARIA", ["1° de Primaria", "2° de Primaria", "3° de Primaria", "4° de Primaria", "5° de Primaria", "6° de Primaria"], ["A", "B"]);
  await seedGradesWithSections("SECUNDARIA", ["1° de Secundaria", "2° de Secundaria", "3° de Secundaria", "4° de Secundaria", "5° de Secundaria"], ["A", "B"]);
  await seedGradesWithSections("ACADEMIA", ["Academia General"], ["A"]);

  // Super administrador
  const passwordHash = await bcrypt.hash("admin123", 10);
  await prisma.user.upsert({
    where: { email: "admin@galileo.edu.pe" },
    update: { role: "SUPER_ADMIN", status: "ACTIVE", passwordHash },
    create: {
      name: "Administrador",
      email: "admin@galileo.edu.pe",
      role: "SUPER_ADMIN",
      status: "ACTIVE",
      passwordHash,
    },
  });

  // Apoderado demo (portal de familias)
  const guardianPasswordHash = await bcrypt.hash("apoderado123", 10);
  const guardianUser = await prisma.user.upsert({
    where: { email: "apoderado@galileo.edu.pe" },
    update: { role: "APODERADO", status: "ACTIVE", passwordHash: guardianPasswordHash },
    create: {
      name: "María Torres",
      email: "apoderado@galileo.edu.pe",
      role: "APODERADO",
      status: "ACTIVE",
      passwordHash: guardianPasswordHash,
    },
  });

  // Cuentas de demostración por rol (contraseña: galileo123)
  await upsertDemoUser("Administrador Ejecutivo", "admin2@galileo.edu.pe", "ADMIN");
  await upsertDemoUser("Rosa Martínez (Directora)", "director@galileo.edu.pe", "DIRECTOR");
  await upsertDemoUser("Coordinador Académico", "coordinador@galileo.edu.pe", "COORDINADOR");
  await upsertDemoUser("Profesor de Matemática", "profesor@galileo.edu.pe", "PROFESOR");
  const alumnoUser = await upsertDemoUser("Diego Alejandro Quispe", "alumno@galileo.edu.pe", "ALUMNO");

  // Alumnos demo
  const studentDejaVu = await prisma.student.upsert({
    where: { document: "78451236" },
    update: { guardianUserId: guardianUser.id },
    create: {
      firstName: "Ana Lucía",
      lastName: "Huamán Torres",
      document: "78451236",
      birthDate: new Date("2016-03-12"),
      gender: "FEMENINO",
      guardianUserId: guardianUser.id,
      guardianName: "María Torres",
      guardianPhone: "987 654 321",
      guardianEmail: "maria.torres@example.com",
    },
  });

  await prisma.student.upsert({
    where: { document: "73122588" },
    update: { guardianUserId: guardianUser.id, userId: alumnoUser.id },
    create: {
      firstName: "Diego Alejandro",
      lastName: "Quispe Rojas",
      document: "73122588",
      birthDate: new Date("2008-07-25"),
      gender: "MASCULINO",
      guardianUserId: guardianUser.id,
      userId: alumnoUser.id,
      guardianName: "Luis Quispe",
      guardianPhone: "965 123 456",
    },
  });

  // Matrícula demo: Ana en 1° de Primaria · A (año activo 2025)
  const demoGrade = await prisma.grade.findFirst({ where: { name: "1° de Primaria" } });
  const demoSection = demoGrade
    ? await prisma.section.findFirst({
        where: { gradeId: demoGrade.id, academicYearId: activeYear.id, name: "A" },
      })
    : null;

  if (demoSection) {
    await prisma.enrollment.upsert({
      where: { studentId_academicYearId: { studentId: studentDejaVu.id, academicYearId: activeYear.id } },
      update: { sectionId: demoSection.id, status: "ENROLLED" },
      create: {
        studentId: studentDejaVu.id,
        sectionId: demoSection.id,
        academicYearId: activeYear.id,
        status: "ENROLLED",
      },
    });
  }

  // Cursos demo para 1° de Primaria
  const demoCourses = ["Matemática", "Comunicación", "Ciencia y Tecnología", "Personal Social"];
  if (demoGrade) {
    for (const name of demoCourses) {
      await prisma.course.upsert({
        where: { gradeId_name: { gradeId: demoGrade.id, name } },
        update: { order: demoCourses.indexOf(name) + 1 },
        create: { gradeId: demoGrade.id, name, order: demoCourses.indexOf(name) + 1 },
      });
    }
  }

  // Nota demo: Ana en Matemática, período 1
  const mathCourse = demoGrade
    ? await prisma.course.findFirst({ where: { gradeId: demoGrade.id, name: "Matemática" } })
    : null;
  if (mathCourse) {
    await prisma.recordGrade.upsert({
      where: { studentId_courseId_term: { studentId: studentDejaVu.id, courseId: mathCourse.id, term: "P1" } },
      update: { score: 17 },
      create: { studentId: studentDejaVu.id, courseId: mathCourse.id, term: "P1", score: 17 },
    });
  }

  // Asistencia demo para la matrícula de Ana
  const demoAttendance: { date: string; status: "PRESENT" | "ABSENT" | "LATE" }[] = [
    { date: "2025-03-17", status: "PRESENT" },
    { date: "2025-03-18", status: "ABSENT" },
    { date: "2025-03-19", status: "LATE" },
  ];
  if (demoSection) {
    for (const rec of demoAttendance) {
      const [y, m, d] = rec.date.split("-").map(Number);
      const atDate = new Date(y, m - 1, d, 12, 0, 0);
      await prisma.attendance.upsert({
        where: {
          sectionId_date_studentId: { sectionId: demoSection.id, date: atDate, studentId: studentDejaVu.id },
        },
        update: { status: rec.status },
        create: {
          sectionId: demoSection.id,
          academicYearId: activeYear.id,
          date: atDate,
          studentId: studentDejaVu.id,
          status: rec.status,
        },
      });
    }
  }

  // Academia demo: curso con horario e inscripción
  let academyCourse = await prisma.academyCourse.findFirst({ where: { name: "Álgebra - Academia" } });
  if (!academyCourse) {
    academyCourse = await prisma.academyCourse.create({
      data: {
        name: "Álgebra - Academia",
        description: "Preparación para ingreso universitario",
        price: new Prisma.Decimal(180),
      },
    });
  }

  const existingSchedule = await prisma.academySchedule.findFirst({
    where: { courseId: academyCourse.id, name: "Grupo Tarde" },
  });
  if (!existingSchedule) {
    await prisma.academySchedule.create({
      data: {
        courseId: academyCourse.id,
        name: "Grupo Tarde",
        day: "LUNES",
        startTime: "16:00",
        endTime: "18:00",
        teacherName: "Prof. Carlos Ríos",
      },
    });
  }

  await prisma.academyEnrollment.upsert({
    where: { studentId_courseId: { studentId: studentDejaVu.id, courseId: academyCourse.id } },
    update: { status: "ACTIVE" },
    create: { studentId: studentDejaVu.id, courseId: academyCourse.id, status: "ACTIVE" },
  });

  // Pagos demo: conceptos + boletas
  const concepts: { name: string; description: string; amount: number; recurring?: boolean }[] = [
    { name: "Matrícula 2025", description: "Matrícula anual", amount: 150 },
    { name: "Pensión Marzo", description: "Pensión mensual de primaria", amount: 350, recurring: true },
    { name: "Mensualidad Academia", description: "Álgebra - Grupo Tarde", amount: 180, recurring: true },
  ];
  for (const c of concepts) {
    await prisma.paymentConcept.upsert({
      where: { name: c.name },
      update: { recurring: c.recurring ?? false },
      create: { name: c.name, description: c.description, amount: new Prisma.Decimal(c.amount), recurring: c.recurring ?? false },
    });
  }

  const conceptMatricula = await prisma.paymentConcept.findUnique({ where: { name: "Matrícula 2025" } });
  if (conceptMatricula) {
    await prisma.payment.upsert({
      where: { receiptNumber: "B-2025-0001" },
      update: {},
      create: {
        receiptNumber: "B-2025-0001",
        studentId: studentDejaVu.id,
        academicYearId: activeYear.id,
        conceptId: conceptMatricula.id,
        amount: new Prisma.Decimal(150),
        date: new Date(2025, 2, 1, 12, 0, 0),
        method: "EFECTIVO",
      },
    });
    await prisma.payment.upsert({
      where: { receiptNumber: "B-2025-0002" },
      update: {},
      create: {
        receiptNumber: "B-2025-0002",
        studentId: studentDejaVu.id,
        academicYearId: activeYear.id,
        conceptId: conceptMatricula.id,
        amount: new Prisma.Decimal(350),
        date: new Date(2025, 2, 10, 12, 0, 0),
        method: "TRANSFERENCIA",
        reference: "OP-884123",
      },
    });
  }

  await prisma.schoolSettings.upsert({
    where: { id: "default" },
    update: {},
    create: {
      id: "default",
      name: "Institución Educativa Particular Galileo",
      shortName: "Galileo EDU",
      slogan: "Inicial · Primaria · Secundaria · Academia",
      ruc: "20512345678",
      address: "Av. Los Próceres 123, Lima",
      phone: "(01) 555-5555",
      email: "informes@galileo.edu.pe",
      website: "gali-edu.vercel.app",
      directorName: "Mg. Rosa Martínez",
      directorDocument: "09234567",
      primaryColor: "#0f766e",
    },
  });

  console.log(
    "✔ Seed completado. Cuentas demo: admin@galileo.edu.pe/admin123 · apoderado@galileo.edu.pe/apoderado123 · resto (admin2/director/coordinador/profesor/alumno@galileo.edu.pe) con galileo123",
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });