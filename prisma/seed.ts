import "dotenv/config";
import { prisma } from "../src/lib/prisma";

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

const activeYear = { id: "" };

async function main() {
  // Año académico vigente: se crea 2026 si no existe y se marca como activo.
  activeYear.id = (
    await prisma.academicYear.upsert({
      where: { year: 2026 },
      update: { isActive: true },
      create: { year: 2026, name: "Año académico 2026", isActive: true },
    })
  ).id;
  await prisma.academicYear.updateMany({
    where: { id: { not: activeYear.id }, isActive: true },
    data: { isActive: false },
  });

  // Niveles
  const inicial = await upsertLevel("Educación Inicial", "INICIAL", 1);
  await upsertGrades(inicial, ["3 años", "4 años", "5 años"]);

  const primaria = await upsertLevel("Educación Primaria", "PRIMARIA", 2);
  await upsertGrades(primaria, ["1° de Primaria", "2° de Primaria", "3° de Primaria", "4° de Primaria", "5° de Primaria", "6° de Primaria"]);

  const secundaria = await upsertLevel("Educación Secundaria", "SECUNDARIA", 3);
  await upsertGrades(secundaria, ["1° de Secundaria", "2° de Secundaria", "3° de Secundaria", "4° de Secundaria", "5° de Secundaria"]);

  const academia = await upsertLevel("Academia Galileo", "ACADEMIA", 4);
  await upsertGrades(academia, ["Academia General"]);

  // Secciones por nivel (año activo)
  await seedGradesWithSections("INICIAL", ["3 años", "4 años", "5 años"], ["A", "B"]);
  await seedGradesWithSections("PRIMARIA", ["1° de Primaria", "2° de Primaria", "3° de Primaria", "4° de Primaria", "5° de Primaria", "6° de Primaria"], ["A", "B"]);
  await seedGradesWithSections("SECUNDARIA", ["1° de Secundaria", "2° de Secundaria", "3° de Secundaria", "4° de Secundaria", "5° de Secundaria"], ["A", "B"]);
  await seedGradesWithSections("ACADEMIA", ["Academia General"], ["A"]);

  // Cursos por defecto para 1° de Primaria
  const firstGrade = await prisma.grade.findFirst({ where: { name: "1° de Primaria" } });
  const baseCourses = ["Matemática", "Comunicación", "Ciencia y Tecnología", "Personal Social"];
  if (firstGrade) {
    for (const name of baseCourses) {
      await prisma.course.upsert({
        where: { gradeId_name: { gradeId: firstGrade.id, name } },
        update: { order: baseCourses.indexOf(name) + 1 },
        create: { gradeId: firstGrade.id, name, order: baseCourses.indexOf(name) + 1 },
      });
    }
  }

  // Configuración de la institución: no pisa valores ya guardados.
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

  console.log("✔ Seed completado: estructura académica del año 2026 (niveles, grados, secciones, cursos). Sin datos demo.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
