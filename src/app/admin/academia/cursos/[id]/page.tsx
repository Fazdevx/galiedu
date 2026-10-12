import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  createAcademySchedule,
  deleteAcademySchedule,
  updateAcademyEnrollmentStatus,
  deleteAcademyEnrollment,
} from "@/app/admin/_actions";
import { Badge, Card, CardContent, CardDescription, CardHeader, CardTitle, Label } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/admin/form";
import { ConfirmDelete } from "@/components/admin/confirm-delete";
import { ServerActionButton } from "@/components/admin/server-action-button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AcademyDay, AcademyEnrollmentStatus } from "@/generated/prisma/client";

const DAY_LABELS: Record<AcademyDay, string> = {
  LUNES: "Lunes",
  MARTES: "Martes",
  MIERCOLES: "Miércoles",
  JUEVES: "Jueves",
  VIERNES: "Viernes",
  SABADO: "Sábado",
  DOMINGO: "Domingo",
};

const ENR_STATUS_LABELS: Record<AcademyEnrollmentStatus, string> = {
  ACTIVE: "Activo",
  COMPLETED: "Completado",
  WITHDRAWN: "Retirado",
};

const ENR_STATUS_TONE: Record<AcademyEnrollmentStatus, "green" | "blue" | "red"> = {
  ACTIVE: "green",
  COMPLETED: "blue",
  WITHDRAWN: "red",
};

export default async function AcademyCourseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const course = await prisma.academyCourse.findUnique({
    where: { id },
    include: {
      schedules: { orderBy: [{ day: "asc" }, { startTime: "asc" }] },
      enrollments: {
        orderBy: { enrolledAt: "desc" },
        include: { student: true },
      },
    },
  });

  if (!course) notFound();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="flex items-center gap-2">
          <Link href="/admin/academia/cursos" className="text-sm text-gray-400 hover:text-gray-600">← Cursos de academia</Link>
          <span className="text-gray-300">/</span>
          <h1 className="text-2xl font-semibold text-gray-900">{course.name}</h1>
        </div>
        <p className="text-sm text-gray-500">
          {course.description ?? "Sin descripción"} ·{" "}
          {course.price !== null ? `Precio: S/ ${Number(course.price).toFixed(2)}` : "Precio no definido"} ·{" "}
          {course.active ? <Badge tone="green">Activo</Badge> : <Badge tone="gray">Inactivo</Badge>}
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Grupos y horarios</CardTitle>
            <CardDescription>Configura los turnos de este curso.</CardDescription>
          </CardHeader>
          <Form action={createAcademySchedule} submitLabel="Agregar horario">
            <input type="hidden" name="courseId" value={course.id} />
            <CardContent className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="name">Grupo / Turno</Label>
                <Input id="name" name="name" required placeholder="Ej. Grupo A - Tarde" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="day">Día</Label>
                <Select id="day" name="day" required defaultValue="LUNES">
                  {(Object.keys(DAY_LABELS) as AcademyDay[]).map((d) => (
                    <option key={d} value={d}>{DAY_LABELS[d]}</option>
                  ))}
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="startTime">Inicio</Label>
                  <Input id="startTime" name="startTime" type="time" required />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="endTime">Fin</Label>
                  <Input id="endTime" name="endTime" type="time" required />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="teacherName">Docente</Label>
                <Input id="teacherName" name="teacherName" placeholder="Ej. Prof. Carlos Ríos" />
              </div>
            </CardContent>
          </Form>

          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Grupo</TableHead>
                  <TableHead>Día</TableHead>
                  <TableHead>Horario</TableHead>
                  <TableHead>Docente</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {course.schedules.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-gray-400">
                      Sin horarios definidos.
                    </TableCell>
                  </TableRow>
                )}
                {course.schedules.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell className="text-gray-700">{DAY_LABELS[s.day]}</TableCell>
                    <TableCell className="text-gray-700">{s.startTime} – {s.endTime}</TableCell>
                    <TableCell className="text-gray-500">{s.teacherName ?? "—"}</TableCell>
                    <TableCell>
                      <div className="flex justify-end">
                        <ConfirmDelete
                          action={deleteAcademySchedule}
                          fields={{ id: s.id }}
                          title="¿Eliminar horario?"
                          description={`Se eliminará el grupo ${s.name} (${DAY_LABELS[s.day]} ${s.startTime} – ${s.endTime}).`}
                        >
                          <Button type="button" variant="destructive" size="sm">Eliminar</Button>
                        </ConfirmDelete>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Inscritos ({course.enrollments.length})</CardTitle>
            <CardDescription>
              Gestiona las inscripciones en{" "}
              <Link href="/admin/academia/inscripciones" className="underline">Inscripciones de academia</Link>.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Alumno</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {course.enrollments.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-gray-400">
                      Aún no hay inscritos.
                    </TableCell>
                  </TableRow>
                )}
                {course.enrollments.map((en) => (
                  <TableRow key={en.id}>
                    <TableCell className="font-medium">
                      {en.student.lastName}, {en.student.firstName}
                    </TableCell>
                    <TableCell className="text-gray-500">{en.enrolledAt.toLocaleDateString("es-PE")}</TableCell>
                    <TableCell><Badge tone={ENR_STATUS_TONE[en.status]}>{ENR_STATUS_LABELS[en.status]}</Badge></TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-2">
                        {en.status === "ACTIVE" ? (
                          <ServerActionButton
                            action={updateAcademyEnrollmentStatus}
                            fields={{ id: en.id, status: "WITHDRAWN" }}
                            success="Inscripción retirada"
                          >
                            Retirar
                          </ServerActionButton>
                        ) : (
                          <ServerActionButton
                            action={updateAcademyEnrollmentStatus}
                            fields={{ id: en.id, status: "ACTIVE" }}
                            success="Inscripción reactivada"
                          >
                            Reactivar
                          </ServerActionButton>
                        )}
                        <ConfirmDelete
                          action={deleteAcademyEnrollment}
                          fields={{ id: en.id }}
                          title="¿Eliminar inscripción?"
                          description={`Se eliminará la inscripción de ${en.student.lastName}, ${en.student.firstName} en ${course.name}.`}
                        >
                          <Button type="button" variant="destructive" size="sm">Eliminar</Button>
                        </ConfirmDelete>
                      </div>
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