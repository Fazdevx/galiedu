import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canAccessStudent } from "@/lib/portal";
import { formatDate } from "@/lib/date";
import { Badge, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { AttendanceStatus, PaymentMethod } from "@/generated/prisma/client";

export const metadata = { title: "Ficha del alumno" };

const METHOD_LABELS: Record<PaymentMethod, string> = {
  EFECTIVO: "Efectivo",
  TARJETA: "Tarjeta",
  TRANSFERENCIA: "Transferencia",
  DEPOSITO: "Depósito",
  YAPE: "Yape",
  PLIN: "Plin",
};

const ATT_LABELS: Record<AttendanceStatus, string> = {
  PRESENT: "Presente",
  ABSENT: "Falta",
  LATE: "Tardanza",
  JUSTIFIED: "Justificada",
};

const ATT_TONE: Record<AttendanceStatus, "green" | "red" | "amber" | "blue"> = {
  PRESENT: "green",
  ABSENT: "red",
  LATE: "amber",
  JUSTIFIED: "blue",
};

const TERMS = ["P1", "P2", "P3", "P4"] as const;

export default async function PortalStudentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  const user = session!.user;
  const { id } = await params;

  if (!(await canAccessStudent(user.id, id))) notFound();

  const student = await prisma.student.findUnique({ where: { id } });
  if (!student) notFound();

  const activeYear = await prisma.academicYear.findFirst({ where: { isActive: true } });

  const enrollment = activeYear
    ? await prisma.enrollment.findFirst({
        where: { studentId: id, academicYearId: activeYear.id, status: { not: "WITHDRAWN" } },
        include: { section: { include: { grade: { include: { level: true } } } } },
      })
    : null;

  const grade = enrollment?.section?.grade ?? null;

  const [courses, recordGrades, attendanceGroup, attendanceRecent, payments] = await Promise.all([
    grade ? prisma.course.findMany({ where: { gradeId: grade.id }, orderBy: { name: "asc" } }) : Promise.resolve([]),
    prisma.recordGrade.findMany({ where: { studentId: id } }),
    activeYear
      ? prisma.attendance.groupBy({ by: ["status"], where: { studentId: id, academicYearId: activeYear.id }, _count: { _all: true } })
      : Promise.resolve([]),
    prisma.attendance.findMany({
      where: { studentId: id, ...(activeYear ? { academicYearId: activeYear.id } : {}) },
      orderBy: { date: "desc" },
      take: 15,
      include: { section: true },
    }),
    prisma.payment.findMany({
      where: { studentId: id },
      orderBy: { date: "desc" },
      include: { concept: true, academicYear: true },
    }),
  ]);

  const scoreMap = new Map(recordGrades.map((rg) => [`${rg.courseId}:${rg.term}`, rg.score]));

  const attCounts: Record<AttendanceStatus, number> = { PRESENT: 0, ABSENT: 0, LATE: 0, JUSTIFIED: 0 };
  for (const g of attendanceGroup) {
    attCounts[g.status] = g._count._all ?? 0;
  }

  const totalPagado = payments.reduce((acc, p) => acc + Number(p.amount), 0);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="flex items-center gap-2">
          <Link href="/portal" className="text-sm text-gray-400 hover:text-gray-600">← Inicio</Link>
          <span className="text-gray-300">/</span>
          <h1 className="text-2xl font-semibold text-gray-900">
            {student.firstName} {student.lastName}
          </h1>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {student.document ? <Badge tone="gray">DNI {student.document}</Badge> : null}
          {grade && enrollment ? (
            <Badge tone="blue">
              {grade.level.name} · {grade.name} · {enrollment.section.name} · {activeYear?.name}
            </Badge>
          ) : (
            <Badge tone="amber">Sin matrícula en el año activo</Badge>
          )}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {grade && activeYear && enrollment ? (
            <Link href={`/portal/alumnos/${id}/boletin?year=${activeYear.id}`} target="_blank">
              <Button type="button" variant="outline" size="sm">Boletín de notas (PDF)</Button>
            </Link>
          ) : null}
          <Link href={`/portal/alumnos/${id}/constancia`} target="_blank">
            <Button type="button" variant="outline" size="sm">Constancia de matrícula (PDF)</Button>
          </Link>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Notas {activeYear ? `· ${activeYear.name}` : ""}</CardTitle>
          <CardDescription>Calificaciones por área curricular y promedio (escala 0–20).</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Área</TableHead>
                {TERMS.map((t) => <TableHead key={t} className="text-center">{t}</TableHead>)}
                <TableHead className="text-center">Promedio</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {courses.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-gray-400">
                    Sin cursos o matrícula vigente.
                  </TableCell>
                </TableRow>
              )}
              {courses.map((c) => {
                const scores = TERMS.map((t) => scoreMap.get(`${c.id}:${t}`) ?? null);
                const vals = scores.filter((v): v is number => v !== null);
                const avg = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
                return (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    {scores.map((v, i) => (
                      <TableCell key={i} className="text-center text-gray-700">
                        {v === null ? "—" : v.toFixed(1)}
                      </TableCell>
                    ))}
                    <TableCell className="text-center font-semibold">
                      {avg === null ? "—" : avg.toFixed(2)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Asistencia</CardTitle>
            <CardDescription>
              Presentes {attCounts.PRESENT} · Tardanzas {attCounts.LATE} · Faltas {attCounts.ABSENT} · Justificadas {attCounts.JUSTIFIED}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Sección</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {attendanceRecent.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-gray-400">Sin registros.</TableCell>
                  </TableRow>
                )}
                {attendanceRecent.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="text-gray-700">{formatDate(a.date)}</TableCell>
                    <TableCell className="text-gray-500">{a.section.name}</TableCell>
                    <TableCell><Badge tone={ATT_TONE[a.status]}>{ATT_LABELS[a.status]}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pagos</CardTitle>
            <CardDescription>
              {payments.length} pago(s) · Total: S/ {totalPagado.toFixed(2)}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>N°</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Concepto</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                  <TableHead className="text-right">Boleta</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-gray-400">Sin pagos registrados.</TableCell>
                  </TableRow>
                )}
                {payments.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono text-xs text-gray-600">{p.receiptNumber}</TableCell>
                    <TableCell className="text-gray-700">{formatDate(p.date)}</TableCell>
                    <TableCell className="text-gray-700">
                      <p>{p.concept.name}</p>
                      <p className="text-xs text-gray-400">{METHOD_LABELS[p.method]}</p>
                    </TableCell>
                    <TableCell className="text-right font-semibold">S/ {Number(p.amount).toFixed(2)}</TableCell>
                    <TableCell className="text-right">
                      <Link href={`/portal/pagos/${p.id}/boleta`} target="_blank">
                        <Button type="button" variant="outline" size="sm">PDF</Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}