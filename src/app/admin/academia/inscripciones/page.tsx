import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/roles";
import { createAcademyEnrollment, updateAcademyEnrollmentStatus, deleteAcademyEnrollment } from "@/app/admin/_actions";
import { Badge, Card, CardContent, CardDescription, CardHeader, CardTitle, Label } from "@/components/ui/card";
import { Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/admin/form";
import { ConfirmDelete } from "@/components/admin/confirm-delete";
import { ServerActionButton } from "@/components/admin/server-action-button";
import { TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DataList, type DataListRow } from "@/components/ui/data-list";
import { AcademyEnrollmentStatus } from "@/generated/prisma/client";

export const metadata = { title: "Academia · Inscripciones" };

const STATUS_LABELS: Record<AcademyEnrollmentStatus, string> = {
  ACTIVE: "Activo",
  COMPLETED: "Completado",
  WITHDRAWN: "Retirado",
};

const STATUS_TONE: Record<AcademyEnrollmentStatus, "green" | "blue" | "red"> = {
  ACTIVE: "green",
  COMPLETED: "blue",
  WITHDRAWN: "red",
};

export default async function AcademyEnrollmentsPage() {
  const session = await auth();
  const canManage = isAdmin(session?.user?.role);
  const [enrollments, students, courses] = await Promise.all([
    prisma.academyEnrollment.findMany({
      orderBy: { createdAt: "desc" },
      include: { student: true, course: true },
    }),
    prisma.student.findMany({ orderBy: [{ lastName: "asc" }] }),
    prisma.academyCourse.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Academia · Inscripciones</h1>
        <p className="text-sm text-gray-500">
          Inscribe a un alumno en un curso de academia.
        </p>
      </div>

      <div className={`grid gap-6 ${canManage ? "lg:grid-cols-[360px_1fr]" : ""}`}>
        {canManage ? (
        <Card>
          <CardHeader>
            <CardTitle>Nueva inscripción</CardTitle>
            <CardDescription>Un alumno por curso de academia.</CardDescription>
          </CardHeader>
          <Form action={createAcademyEnrollment} submitLabel="Inscribir">
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
                <Label htmlFor="courseId">Curso de academia</Label>
                <Select id="courseId" name="courseId" required>
                  {courses.length === 0 && <option value="">— Sin cursos activos —</option>}
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}{c.price !== null ? ` (S/ ${Number(c.price).toFixed(2)})` : ""}</option>
                  ))}
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="status">Estado</Label>
                <Select id="status" name="status" defaultValue="ACTIVE">
                  <option value="ACTIVE">Activo</option>
                  <option value="COMPLETED">Completado</option>
                  <option value="WITHDRAWN">Retirado</option>
                </Select>
              </div>
            </CardContent>
          </Form>
        </Card>
        ) : null}

        <DataList
          title="Listado"
          description={`${enrollments.length} inscripción(es)`}
          placeholder="Buscar por alumno o curso…"
          emptyTitle="Sin inscripciones"
          emptyDescription="Inscribe al primer alumno con el formulario."
          emptyColSpan={5}
          pagination={25}
          rows={enrollments.map(
            (en): DataListRow => ({
              id: en.id,
              search: `${en.student.lastName} ${en.student.firstName} ${en.course.name} ${STATUS_LABELS[en.status]}`,
              node: (
                <TableRow key={en.id}>
                  <TableCell className="font-medium">
                    <Link href={`/admin/alumnos/${en.student.id}`} className="hover:text-primary hover:underline">
                      {en.student.lastName}, {en.student.firstName}
                    </Link>
                  </TableCell>
                  <TableCell className="text-gray-700">
                    <Link href={`/admin/academia/cursos/${en.course.id}`} className="hover:text-primary hover:underline">
                      {en.course.name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-gray-500">{en.enrolledAt.toLocaleDateString("es-PE")}</TableCell>
                  <TableCell><Badge tone={STATUS_TONE[en.status]}>{STATUS_LABELS[en.status]}</Badge></TableCell>
                  <TableCell>
                    {canManage ? (
                    <div className="flex items-center justify-end gap-2">
                      {en.status === "ACTIVE" ? (
                        <ServerActionButton
                          action={updateAcademyEnrollmentStatus}
                          fields={{ id: en.id, status: "WITHDRAWN" }}
                          success="Inscripción retirada"
                        >
                          Retirar
                        </ServerActionButton>
                      ) : en.status === "WITHDRAWN" ? (
                        <ServerActionButton
                          action={updateAcademyEnrollmentStatus}
                          fields={{ id: en.id, status: "ACTIVE" }}
                          success="Inscripción reactivada"
                        >
                          Reactivar
                        </ServerActionButton>
                      ) : null}
                      <ConfirmDelete
                        action={deleteAcademyEnrollment}
                        fields={{ id: en.id }}
                        title="¿Eliminar inscripción?"
                        description={`Se eliminará la inscripción de ${en.student.lastName}, ${en.student.firstName} en ${en.course.name}.`}
                      >
                        <Button type="button" variant="destructive" size="sm">Eliminar</Button>
                      </ConfirmDelete>
                    </div>
                    ) : null}
                  </TableCell>
                </TableRow>
              ),
            }),
          )}
          header={
            <TableHeader>
              <TableRow>
                <TableHead>Alumno</TableHead>
                <TableHead>Curso</TableHead>
                <TableHead>Fecha</TableHead>
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