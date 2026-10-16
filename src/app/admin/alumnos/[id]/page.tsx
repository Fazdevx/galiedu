import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/roles";
import { updateStudent } from "@/app/admin/_actions";
import { Badge, Card, CardContent, CardDescription, CardHeader, CardTitle, Label } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/admin/form";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toDateInput } from "@/lib/date";

function toDateInputValue(d: Date | null): string {
  return d ? toDateInput(d) : "";
}

const ENROLLMENT_STATUS_LABELS: Record<string, string> = {
  PENDING: "Pendiente",
  ENROLLED: "Matriculado",
  WITHDRAWN: "Retirado",
};

export default async function StudentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const student = await prisma.student.findUnique({
    where: { id },
    include: {
      enrollments: {
        orderBy: { academicYear: { year: "desc" } },
        include: {
          section: { include: { grade: { include: { level: true } } } },
          academicYear: true,
        },
      },
    },
  });

  if (!student) notFound();

  const session = await auth();
  const canManage = isAdmin(session?.user?.role);

  const guardianUsers = await prisma.user.findMany({
    where: { role: "APODERADO" },
    orderBy: { name: "asc" },
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="flex items-center gap-2">
          <Link href="/admin/alumnos" className="text-sm text-gray-400 hover:text-gray-600">← Alumnos</Link>
          <span className="text-gray-300">/</span>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
            {student.lastName}, {student.firstName}
          </h1>
        </div>
        <p className="text-sm text-gray-500">
          Ficha del alumno · {student.document ?? "sin documento"}
        </p>
        <div className="mt-3 flex items-center gap-2">
          <Link href={`/admin/alumnos/${student.id}/constancia`} target="_blank">
            <Button type="button" variant="outline" size="sm">Constancia de matrícula (PDF)</Button>
          </Link>
        </div>
      </div>

      <div className={`grid gap-6 ${canManage ? "lg:grid-cols-[420px_1fr]" : ""}`}>
        {canManage ? (
        <Card>
          <CardHeader>
            <CardTitle>Editar ficha</CardTitle>
            <CardDescription>Datos personales y del apoderado.</CardDescription>
          </CardHeader>
          <Form action={updateStudent} submitLabel="Guardar cambios">
            <input type="hidden" name="id" value={student.id} />
            <CardContent className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="firstName">Nombres</Label>
                <Input id="firstName" name="firstName" required defaultValue={student.firstName} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="lastName">Apellidos</Label>
                <Input id="lastName" name="lastName" required defaultValue={student.lastName} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="document">DNI / Doc.</Label>
                <Input id="document" name="document" maxLength={20} defaultValue={student.document ?? ""} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="birthDate">Nacimiento</Label>
                  <Input id="birthDate" name="birthDate" type="date" defaultValue={toDateInputValue(student.birthDate)} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="gender">Sexo</Label>
                  <Select id="gender" name="gender" defaultValue={student.gender ?? ""}>
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
                    <Label htmlFor="guardianUserId">Cuenta de acceso (apoderado)</Label>
                    <Select id="guardianUserId" name="guardianUserId" defaultValue={student.guardianUserId ?? ""}>
                      <option value="">— Sin cuenta —</option>
                      {guardianUsers.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.name ?? g.email} ({g.email})
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="guardianName">Nombre</Label>
                    <Input id="guardianName" name="guardianName" defaultValue={student.guardianName ?? ""} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="guardianPhone">Teléfono</Label>
                    <Input id="guardianPhone" name="guardianPhone" defaultValue={student.guardianPhone ?? ""} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="guardianEmail">Correo</Label>
                    <Input id="guardianEmail" name="guardianEmail" type="email" defaultValue={student.guardianEmail ?? ""} />
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="status">Estado</Label>
                <Select id="status" name="status" defaultValue={student.status}>
                  <option value="ACTIVE">Activo</option>
                  <option value="INACTIVE">Inactivo</option>
                  <option value="SUSPENDED">Suspendido</option>
                </Select>
              </div>
            </CardContent>
          </Form>
        </Card>
        ) : null}

        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Historial de matrículas</CardTitle>
              <CardDescription>
                Cada año académico el alumno se matricula en una sección.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Año</TableHead>
                    <TableHead>Nivel / Grado</TableHead>
                    <TableHead>Sección</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Fecha</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {student.enrollments.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-gray-400">
                        Sin matrículas.{" "}
                        <Link href="/admin/matriculas" className="underline">Matricular</Link>
                      </TableCell>
                    </TableRow>
                  )}
                  {student.enrollments.map((en) => (
                    <TableRow key={en.id}>
                      <TableCell className="font-medium">{en.academicYear.year}</TableCell>
                      <TableCell className="text-gray-700">
                        {en.section.grade.level.name} · {en.section.grade.name}
                      </TableCell>
                      <TableCell className="text-gray-700">{en.section.name}</TableCell>
                      <TableCell>
                        <Badge tone={en.status === "ENROLLED" ? "green" : en.status === "PENDING" ? "amber" : "red"}>
                          {ENROLLMENT_STATUS_LABELS[en.status]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-gray-500">
                        {en.enrolledAt.toLocaleDateString("es-PE")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}