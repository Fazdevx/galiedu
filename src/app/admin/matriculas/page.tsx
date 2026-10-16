import { prisma } from "@/lib/prisma";
import { createEnrollment, deleteEnrollment, updateEnrollmentStatus } from "@/app/admin/_actions";
import { Badge, Card, CardContent, CardDescription, CardHeader, CardTitle, Label } from "@/components/ui/card";
import { Select, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/admin/form";
import { ConfirmDelete } from "@/components/admin/confirm-delete";
import { ServerActionButton } from "@/components/admin/server-action-button";
import { TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DataList, type DataListRow } from "@/components/ui/data-list";

export const metadata = { title: "Matrículas" };

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Pendiente",
  ENROLLED: "Matriculado",
  WITHDRAWN: "Retirado",
};

const STATUS_TONE: Record<string, "green" | "amber" | "red"> = {
  PENDING: "amber",
  ENROLLED: "green",
  WITHDRAWN: "red",
};

type SectionGroup = { label: string; sections: { id: string; name: string }[] };

export default async function EnrollmentsPage() {
  const [enrollments, students, sections] = await Promise.all([
    prisma.enrollment.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        student: true,
        section: { include: { grade: { include: { level: true } } } },
        academicYear: true,
      },
    }),
    prisma.student.findMany({ orderBy: [{ lastName: "asc" }] }),
    prisma.section.findMany({
      orderBy: [{ academicYear: { year: "desc" } }, { grade: { level: { order: "asc" } } }, { grade: { order: "asc" } }],
      include: { grade: { include: { level: true } }, academicYear: true },
    }),
  ]);

  const groups = new Map<string, SectionGroup>();
  for (const s of sections) {
    const key = `${s.academicYear.year}|${s.grade.level.order}|${s.grade.order}|${s.grade.level.id}|${s.grade.id}`;
    const label = `${s.academicYear.name} · ${s.grade.level.name} · ${s.grade.name}`;
    const existing = groups.get(key);
    if (existing) {
      existing.sections.push({ id: s.id, name: s.name });
    } else {
      groups.set(key, { label, sections: [{ id: s.id, name: s.name }] });
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Matrículas</h1>
        <p className="text-sm text-gray-500">
          Vincula un alumno a una sección dentro de un año académico.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Nueva matrícula</CardTitle>
            <CardDescription>Un alumno por año académico.</CardDescription>
          </CardHeader>
          <Form action={createEnrollment} submitLabel="Matricular">
            <CardContent className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="studentId">Alumno</Label>
                <Select id="studentId" name="studentId" required>
                  {students.map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.lastName}, {st.firstName}{st.document ? ` — ${st.document}` : ""}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="sectionId">Sección</Label>
                <Select id="sectionId" name="sectionId" required>
                  {[...groups.entries()].map(([key, g]) => (
                    <optgroup key={key} label={g.label}>
                      {g.sections.map((sec) => (
                        <option key={sec.id} value={sec.id}>{sec.name}</option>
                      ))}
                    </optgroup>
                  ))}
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="status">Estado</Label>
                <Select id="status" name="status" defaultValue="ENROLLED">
                  <option value="ENROLLED">Matriculado</option>
                  <option value="PENDING">Pendiente</option>
                  <option value="WITHDRAWN">Retirado</option>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="notes">Observaciones</Label>
                <Textarea id="notes" name="notes" rows={3} placeholder="Opcional" />
              </div>
            </CardContent>
          </Form>
        </Card>

        <DataList
          title="Listado"
          description={`${enrollments.length} matrícula(s)`}
          placeholder="Buscar por alumno, sección o año…"
          emptyTitle="Sin matrículas"
          emptyDescription="Registra la primera matrícula con el formulario."
          emptyColSpan={6}
          pagination={25}
          rows={enrollments.map(
            (en): DataListRow => ({
              id: en.id,
              search: `${en.student.lastName} ${en.student.firstName} ${en.section.grade.level.name} ${en.section.grade.name} ${en.section.name} ${en.academicYear.year} ${STATUS_LABELS[en.status]}`,
              node: (
                <TableRow key={en.id}>
                  <TableCell className="font-medium">
                    {en.student.lastName}, {en.student.firstName}
                  </TableCell>
                  <TableCell className="text-gray-700">
                    {en.section.grade.level.name} · {en.section.grade.name}
                  </TableCell>
                  <TableCell className="text-gray-700">{en.section.name}</TableCell>
                  <TableCell className="text-gray-500">{en.academicYear.year}</TableCell>
                  <TableCell><Badge tone={STATUS_TONE[en.status]}>{STATUS_LABELS[en.status]}</Badge></TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-2">
                      <ServerActionButton
                        action={updateEnrollmentStatus}
                        fields={{ id: en.id, status: en.status === "ENROLLED" ? "WITHDRAWN" : "ENROLLED" }}
                        success={en.status === "ENROLLED" ? "Matrícula retirada" : "Matrícula reactivada"}
                      >
                        {en.status === "ENROLLED" ? "Retirar" : "Reactivar"}
                      </ServerActionButton>
                      <ConfirmDelete
                        action={deleteEnrollment}
                        fields={{ id: en.id }}
                        title="¿Eliminar matrícula?"
                        description={`Se eliminará la matrícula de ${en.student.lastName}, ${en.student.firstName} (${en.academicYear.year}).`}
                      >
                        <Button type="button" variant="destructive" size="sm">Eliminar</Button>
                      </ConfirmDelete>
                    </div>
                  </TableCell>
                </TableRow>
              ),
            }),
          )}
          header={
            <TableHeader>
              <TableRow>
                <TableHead>Alumno</TableHead>
                <TableHead>Nivel · Grado</TableHead>
                <TableHead>Sección</TableHead>
                <TableHead>Año</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
          }
        />
      </div>
    </div>
  );
}