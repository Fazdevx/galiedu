import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { createStudent, deleteStudent } from "@/app/admin/_actions";
import { Badge, Card, CardContent, CardDescription, CardHeader, CardTitle, Label } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/admin/form";
import { ConfirmDelete } from "@/components/admin/confirm-delete";
import { TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DataList, type DataListRow } from "@/components/ui/data-list";

export const metadata = { title: "Alumnos" };

function fullName(s: { firstName: string; lastName: string }) {
  return `${s.lastName}, ${s.firstName}`;
}

function currentEnrollment(s: {
  enrollments: {
    status: string;
    academicYear: { isActive: boolean };
    section: { grade: { level: { name: string }; name: string }; name: string };
  }[];
}) {
  const current = s.enrollments.find((e) => e.academicYear.isActive && e.status === "ENROLLED");
  return current
    ? `${current.section.grade.level.name} · ${current.section.grade.name} · ${current.section.name}`
    : null;
}

export default async function StudentsPage() {
  const students = await prisma.student.findMany({
    orderBy: [{ lastName: "asc" }],
    include: {
      enrollments: {
        include: {
          section: { include: { grade: { include: { level: true } } } },
          academicYear: true,
        },
      },
    },
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Alumnos</h1>
        <p className="text-sm text-gray-500">
          Ficha de estudiantes. La matrícula a secciones se gestiona en el módulo de matrículas.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Nuevo alumno</CardTitle>
            <CardDescription>Datos personales y del apoderado.</CardDescription>
          </CardHeader>
          <Form action={createStudent} submitLabel="Registrar alumno">
            <CardContent className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="firstName">Nombres</Label>
                <Input id="firstName" name="firstName" required placeholder="Ej. Ana Lucía" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="lastName">Apellidos</Label>
                <Input id="lastName" name="lastName" required placeholder="Ej. Huamán Torres" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="document">DNI / Doc.</Label>
                <Input id="document" name="document" maxLength={20} placeholder="Ej. 78451236" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="birthDate">Nacimiento</Label>
                  <Input id="birthDate" name="birthDate" type="date" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="gender">Sexo</Label>
                  <Select id="gender" name="gender">
                    <option value="">—</option>
                    <option value="MASCULINO">Masculino</option>
                    <option value="FEMENINO">Femenino</option>
                  </Select>
                </div>
              </div>
              <div className="border-t border-gray-100 pt-3">
                <p className="mb-2 text-xs font-medium text-gray-500">Apoderado</p>
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="guardianName">Nombre</Label>
                    <Input id="guardianName" name="guardianName" placeholder="Ej. María Torres" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="guardianPhone">Teléfono</Label>
                    <Input id="guardianPhone" name="guardianPhone" placeholder="Ej. 987 654 321" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="guardianEmail">Correo</Label>
                    <Input id="guardianEmail" name="guardianEmail" type="email" placeholder="correo@apoderado.pe" />
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="status">Estado</Label>
                <Select id="status" name="status" defaultValue="ACTIVE">
                  <option value="ACTIVE">Activo</option>
                  <option value="INACTIVE">Inactivo</option>
                  <option value="SUSPENDED">Suspendido</option>
                </Select>
              </div>
            </CardContent>
          </Form>
        </Card>

        <DataList
          title="Listado"
          description={`${students.length} alumno(s)`}
          placeholder="Buscar por nombre, documento o apoderado…"
          emptyTitle="Sin alumnos"
          emptyDescription="Registra el primer alumno con el formulario."
          emptyColSpan={6}
          pagination={25}
          exportOptions={{
            filename: "alumnos",
            columns: ["Alumno", "Documento", "Nacimiento", "Sexo", "Matrícula actual", "Apoderado", "Teléfono", "Correo apoderado", "Estado"],
            rows: students.map((s) => ({
              id: s.id,
              cells: [
                fullName(s),
                s.document ?? "",
                s.birthDate ? s.birthDate.toISOString().slice(0, 10) : "",
                s.gender ?? "",
                currentEnrollment(s) ?? "Sin matrícula",
                s.guardianName ?? "",
                s.guardianPhone ?? "",
                s.guardianEmail ?? "",
                s.status,
              ],
            })),
          }}
          rows={students.map((s): DataListRow => {
            const current = currentEnrollment(s);
            const matricula = current ?? "Sin matrícula";
            return {
              id: s.id,
              search: `${s.lastName} ${s.firstName} ${s.document ?? ""} ${s.guardianName ?? ""} ${matricula}`,
              node: (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{fullName(s)}</TableCell>
                  <TableCell className="text-gray-500">{s.document ?? "—"}</TableCell>
                  <TableCell className="text-gray-700">
                    {current ? matricula : <Badge tone="gray">Sin matrícula</Badge>}
                  </TableCell>
                  <TableCell className="text-gray-500">{s.guardianName ?? "—"}</TableCell>
                  <TableCell>
                    {s.status === "ACTIVE" ? (
                      <Badge tone="green">Activo</Badge>
                    ) : (
                      <Badge tone="amber">{s.status === "SUSPENDED" ? "Suspendido" : "Inactivo"}</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-2">
                      <Link href={`/admin/alumnos/${s.id}`}>
                        <Button type="button" variant="outline" size="sm">Ver ficha</Button>
                      </Link>
                      <ConfirmDelete
                        action={deleteStudent}
                        fields={{ id: s.id }}
                        title="¿Eliminar alumno?"
                        description={`Se eliminará a ${fullName(s)} con sus matrículas, notas y pagos asociados.`}
                      >
                        <Button type="button" variant="destructive" size="sm">Eliminar</Button>
                      </ConfirmDelete>
                    </div>
                  </TableCell>
                </TableRow>
              ),
            };
          })}
          header={
            <TableHeader>
              <TableRow>
                <TableHead>Alumno</TableHead>
                <TableHead>Documento</TableHead>
                <TableHead>Matrícula actual</TableHead>
                <TableHead>Apoderado</TableHead>
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