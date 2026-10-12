import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cronAuthorized } from "@/lib/cron-auth";
import { sendMail } from "@/lib/mailer";

/**
 * Envía un recordatorio a los apoderados de alumnos matriculados que aún no
 * registran un pago de un concepto recurrente (p. ej. pensión) en el mes actual.
 */
export async function GET(request: Request) {
  if (!cronAuthorized(request)) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  const period = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;

  const concepts = await prisma.paymentConcept.findMany({
    where: { active: true, recurring: true },
    select: { id: true, name: true },
  });
  if (!concepts.length) {
    return NextResponse.json({ ok: true, reminders: 0, reason: "Sin conceptos recurrentes." });
  }

  const conceptIds = concepts.map((concept) => concept.id);

  const students = await prisma.student.findMany({
    where: { status: "ACTIVE", enrollments: { some: { status: "ENROLLED" } } },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      guardianEmail: true,
      guardianUser: { select: { email: true } },
    },
  });

  const payments = await prisma.payment.findMany({
    where: { date: { gte: start, lt: end }, conceptId: { in: conceptIds } },
    select: { studentId: true },
  });
  const paid = new Set(payments.map((payment) => payment.studentId));

  let reminders = 0;
  for (const student of students) {
    if (paid.has(student.id)) continue;
    const email = student.guardianEmail || student.guardianUser?.email;
    if (!email) continue;

    await sendMail({
      to: email,
      subject: "Recordatorio de pago de pensión · Galileo EDU",
      text: `Estimado apoderado, le recordamos que aún no registramos el pago de pensiones del mes ${period} para el alumno ${student.firstName} ${student.lastName}.`,
      html: `<p>Estimado apoderado,</p><p>Le recordamos que aún no registramos el pago de pensiones del mes <strong>${period}</strong> para el alumno <strong>${student.firstName} ${student.lastName}</strong>.</p><p>Puede acercarse a la institución para regularizar el pago.</p>`,
    }).catch(() => {});
    reminders += 1;
  }

  return NextResponse.json({ ok: true, period, reminders });
}
