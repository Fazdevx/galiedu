import { prisma } from "@/lib/prisma";
import { dayRangeUTC, todayInput } from "@/lib/date";
import { Badge, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AsistenciaGrid } from "@/components/admin/asistencia-grid";
import { AsistenciaSelects, type SectionGroup } from "@/components/admin/asistencia-selects";
import type { AttendanceStatus } from "@/generated/prisma/client";

export const metadata = { title: "Asistencia" };

const STATUS_LABELS: Record<AttendanceStatus, string> = {
  PRESENT: "Asist.",
  ABSENT: "Faltas",
  LATE: "Tardanzas",
  JUSTIFIED: "Justif.",
};

function dayRange(dateStr: string) {
  return dayRangeUTC(dateStr);
}

export default async function AttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ section?: string; date?: string }>;
}) {
  const sp = await searchParams;
  let date = sp.date?.trim() || todayInput();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) date = todayInput();
  const sectionId = sp.section?.trim() || null;

  const sections = await prisma.section.findMany({
    orderBy: [{ academicYear: { year: "desc" } }, { grade: { level: { order: "asc" } } }, { grade: { order: "asc" } }],
    include: { grade: { include: { level: true } }, academicYear: true },
  });

  const groups: SectionGroup[] = [];
  const groupMap = new Map<string, SectionGroup>();
  for (const s of sections) {
    const key = `${s.academicYear.year}|${s.grade.level.order}|${s.grade.order}|${s.grade.level.id}|${s.grade.id}`;
    const label = `${s.academicYear.name} · ${s.grade.level.name} · ${s.grade.name}`;
    const existing = groupMap.get(key);
    if (existing) {
      existing.options.push({ value: s.id, label: s.name });
    } else {
      const group = { label, options: [{ value: s.id, label: s.name }] };
      groupMap.set(key, group);
      groups.push(group);
    }
  }

  let grid = null;
  let summary: Array<{ studentId: string; name: string; counts: Record<AttendanceStatus, number> }> = [];
  let selectedLabel: string | null = null;

  if (sectionId) {
    const section = await prisma.section.findUnique({
      where: { id: sectionId },
      include: { grade: { include: { level: true } }, academicYear: true },
    });

    if (section) {
      selectedLabel = `${section.grade.level.name} · ${section.grade.name} · ${section.name} (${section.academicYear.name})`;

      const { start, end } = dayRange(date);

      const [enrollments, dayAttendances, group] = await Promise.all([
        prisma.enrollment.findMany({
          where: { sectionId, status: "ENROLLED" },
          include: { student: true },
        }),
        prisma.attendance.findMany({
          where: { sectionId, date: { gte: start, lt: end } },
        }),
        prisma.attendance.groupBy({
          by: ["studentId", "status"],
          where: { sectionId },
          _count: { _all: true },
        }),
      ]);

      const initialStatuses: Record<string, AttendanceStatus> = {};
      for (const at of dayAttendances) initialStatuses[at.studentId] = at.status;

      const studentName = new Map<string, string>();
      for (const en of enrollments) {
        studentName.set(en.student.id, `${en.student.lastName}, ${en.student.firstName}`);
      }

      for (const g of group) {
        const entry = summary.find((s) => s.studentId === g.studentId);
        if (entry) {
          entry.counts[g.status] = g._count._all;
        } else {
          summary.push({
            studentId: g.studentId,
            name: studentName.get(g.studentId) ?? "—",
            counts: { PRESENT: 0, ABSENT: 0, LATE: 0, JUSTIFIED: 0, [g.status]: g._count._all },
          });
        }
      }
      // Asegurar fila para todos los matriculados
      for (const en of enrollments) {
        if (!summary.some((s) => s.studentId === en.student.id)) {
          summary.push({
            studentId: en.student.id,
            name: `${en.student.lastName}, ${en.student.firstName}`,
            counts: { PRESENT: 0, ABSENT: 0, LATE: 0, JUSTIFIED: 0 },
          });
        }
      }
      summary = summary
        .filter((s) => studentName.has(s.studentId))
        .sort((a, b) => a.name.localeCompare(b.name));

      grid = (
        <AsistenciaGrid
          students={enrollments
            .map((en) => ({ id: en.student.id, name: `${en.student.lastName}, ${en.student.firstName}` }))
            .sort((a, b) => a.name.localeCompare(b.name))}
          sectionId={sectionId}
          date={date}
          initialStatuses={initialStatuses}
        />
      );
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Asistencia</h1>
        <p className="text-sm text-gray-500">
          Registro diario por sección: presente, falta, tardanza o justificado.
        </p>
      </div>

      <Card>
        <CardHeader className="gap-4">
          <AsistenciaSelects groups={groups} sectionId={sectionId} date={date} />
        </CardHeader>
      </Card>

      {grid ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle>{selectedLabel ?? "Sección"}</CardTitle>
              <CardDescription>Asistencia del día {date}.</CardDescription>
            </CardHeader>
            <CardContent>{grid}</CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Resumen del año</CardTitle>
              <CardDescription>Conteo de asistencia acumulada de la sección.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Alumno</TableHead>
                    {(Object.keys(STATUS_LABELS) as AttendanceStatus[]).map((st) => (
                      <TableHead key={st} className="text-center">{STATUS_LABELS[st]}</TableHead>
                    ))}
                    <TableHead className="text-center">Total días</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {summary.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-gray-400">
                        Aún no se registró asistencia para esta sección.
                      </TableCell>
                    </TableRow>
                  )}
                  {summary.map((s) => {
                    const total = s.counts.PRESENT + s.counts.ABSENT + s.counts.LATE + s.counts.JUSTIFIED;
                    return (
                      <TableRow key={s.studentId}>
                        <TableCell className="font-medium">{s.name}</TableCell>
                        <TableCell className="text-center text-gray-700">{s.counts.PRESENT}</TableCell>
                        <TableCell className="text-center">
                          {s.counts.ABSENT > 0 ? <Badge tone="red">{s.counts.ABSENT}</Badge> : <span className="text-gray-400">0</span>}
                        </TableCell>
                        <TableCell className="text-center text-gray-700">{s.counts.LATE}</TableCell>
                        <TableCell className="text-center text-gray-700">{s.counts.JUSTIFIED}</TableCell>
                        <TableCell className="text-center font-semibold">{total}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      ) : (
        <Card>
          <CardContent className="py-10 text-center text-sm text-gray-400">
            Elige una sección y fecha para registrar la asistencia.
          </CardContent>
        </Card>
      )}
    </div>
  );
}