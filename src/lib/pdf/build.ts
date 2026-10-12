import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/date";
import type { BoletaData, BoletínData, ConstanciaData } from "@/lib/pdf/documents";
import type { Course, PaymentMethod, RecordGrade } from "@/generated/prisma/client";

const METHOD_LABELS: Record<PaymentMethod, string> = {
  EFECTIVO: "Efectivo",
  TARJETA: "Tarjeta",
  TRANSFERENCIA: "Transferencia",
  DEPOSITO: "Depósito",
  YAPE: "Yape",
  PLIN: "Plin",
};

export async function buildBoletaData(paymentId: string): Promise<BoletaData | null> {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: { student: true, concept: true, academicYear: true },
  });
  if (!payment) return null;

  return {
    receiptNumber: payment.receiptNumber,
    dateText: formatDate(payment.date, {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }),
    yearTitle: String(payment.academicYear.year),
    student: {
      fullName: `${payment.student.lastName}, ${payment.student.firstName}`,
      document: payment.student.document ?? undefined,
      guardianName: payment.student.guardianName ?? undefined,
      guardianPhone: payment.student.guardianPhone ?? undefined,
    },
    conceptName: payment.concept.name,
    conceptDescription: payment.concept.description ?? undefined,
    method: METHOD_LABELS[payment.method],
    reference: payment.reference ?? undefined,
    amount: Number(payment.amount),
  };
}

export async function buildBoletinData(studentId: string, yearId: string): Promise<BoletínData | null> {
  const [student, academicYear] = await Promise.all([
    prisma.student.findUnique({ where: { id: studentId } }),
    prisma.academicYear.findUnique({ where: { id: yearId } }),
  ]);
  if (!student || !academicYear) return null;

  const enrollment = await prisma.enrollment.findFirst({
    where: { studentId, academicYearId: yearId, status: { not: "WITHDRAWN" } },
    include: { section: { include: { grade: { include: { level: true } } } } },
  });
  if (!enrollment?.section?.grade) return null;

  const section = enrollment.section;
  const grade = section.grade;

  const courses = await prisma.course.findMany({ where: { gradeId: grade.id }, orderBy: { name: "asc" } });

  const courseIds = courses.map((c: Course) => c.id);
  const [recordGrades, attendanceGroup] = await Promise.all([
    prisma.recordGrade.findMany({ where: { studentId, courseId: { in: courseIds } } }),
    prisma.attendance.groupBy({
      by: ["status"],
      where: { studentId, sectionId: section.id, academicYearId: yearId },
      _count: { _all: true },
    }),
  ]);

  const scoreMap = new Map<string, RecordGrade>();
  for (const rg of recordGrades) scoreMap.set(`${rg.courseId}:${rg.term}`, rg);

  const rows = courses.map((course: Course) => {
    const t = (term: string): number | null => scoreMap.get(`${course.id}:${term}`)?.score ?? null;
    return { course: course.name, p1: t("P1"), p2: t("P2"), p3: t("P3"), p4: t("P4") };
  });

  const attendance = { present: 0, absent: 0, late: 0, justified: 0 };
  for (const g of attendanceGroup) {
    const n = g._count._all ?? 0;
    if (g.status === "PRESENT") attendance.present += n;
    else if (g.status === "ABSENT") attendance.absent += n;
    else if (g.status === "LATE") attendance.late += n;
    else if (g.status === "JUSTIFIED") attendance.justified += n;
  }

  return {
    yearName: academicYear.name,
    termLabels: ["I Bim.", "II Bim.", "III Bim.", "IV Bim."],
    student: {
      fullName: `${student.lastName}, ${student.firstName}`,
      document: student.document ?? undefined,
      levelName: grade.level.name,
      gradeName: grade.name,
      sectionName: section.name,
      guardianName: student.guardianName ?? undefined,
    },
    rows: rows.map((r) => {
      const vals = [r.p1, r.p2, r.p3, r.p4].filter((v): v is number => v !== null);
      const avg = vals.length === 0 ? null : vals.reduce((a, b) => a + b, 0) / vals.length;
      return { ...r, avg: avg === null ? null : Math.round(avg * 100) / 100 };
    }),
    attendance: {
      present: attendance.present,
      absent: attendance.absent,
      late: attendance.late,
      justified: attendance.justified,
      total: attendance.present + attendance.absent + attendance.late + attendance.justified,
    },
    issuedAt: new Date().toLocaleDateString("es-PE", { day: "numeric", month: "long", year: "numeric" }),
  };
}

export async function buildConstanciaData(studentId: string): Promise<ConstanciaData | null> {
  const student = await prisma.student.findUnique({ where: { id: studentId } });
  if (!student) return null;

  const activeYear = await prisma.academicYear.findFirst({ where: { isActive: true } });
  if (!activeYear) return null;

  const enrollment = await prisma.enrollment.findFirst({
    where: { studentId, academicYearId: activeYear.id, status: "ENROLLED" },
    include: { section: { include: { grade: { include: { level: true } } } } },
  });
  if (!enrollment?.section?.grade) return null;

  const { grade } = enrollment.section;
  const { level } = grade;

  return {
    yearName: activeYear.name,
    student: {
      fullName: `${student.lastName}, ${student.firstName}`,
      document: student.document ?? undefined,
      levelName: level.name,
      gradeName: grade.name,
      sectionName: enrollment.section.name,
      guardianName: student.guardianName ?? undefined,
    },
    issuedAt: new Date().toLocaleDateString("es-PE", { day: "numeric", month: "long", year: "numeric" }),
  };
}
