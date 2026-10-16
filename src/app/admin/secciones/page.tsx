import { prisma } from "@/lib/prisma";
import { createSection, deleteSection } from "@/app/admin/_actions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Label } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/admin/form";
import { ConfirmDelete } from "@/components/admin/confirm-delete";
import { TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DataList, type DataListRow } from "@/components/ui/data-list";

export const metadata = { title: "Secciones" };

export default async function SectionsPage() {
  const [sections, grades, academicYears] = await Promise.all([
    prisma.section.findMany({
      orderBy: [{ createdAt: "asc" }],
      include: { grade: { include: { level: true } }, academicYear: true, _count: { select: { enrollments: true } } },
    }),
    prisma.grade.findMany({ orderBy: [{ levelId: "asc" }, { order: "asc" }], include: { level: true } }),
    prisma.academicYear.findMany({ orderBy: { year: "desc" } }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Secciones</h1>
        <p className="text-sm text-gray-500">
          Aulas dentro de cada grado y año académico. Ej. 1° A, 1° B, Academia – Matemática.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Nueva sección</CardTitle>
            <CardDescription>Vincular grado y año académico.</CardDescription>
          </CardHeader>
          <Form action={createSection} submitLabel="Crear sección">
            <CardContent className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="academicYearId">Año académico</Label>
                <Select id="academicYearId" name="academicYearId" required>
                  {academicYears.map((ay) => (
                    <option key={ay.id} value={ay.id}>{ay.name}{ay.isActive ? " (activo)" : ""}</option>
                  ))}
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="gradeId">Grado</Label>
                <Select id="gradeId" name="gradeId" required>
                  {grades.map((g) => (
                    <option key={g.id} value={g.id}>{g.level.name} · {g.name}</option>
                  ))}
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="name">Nombre / Aula</Label>
                <Input id="name" name="name" required placeholder="Ej. A" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="capacity">Capacidad</Label>
                <Input id="capacity" name="capacity" type="number" min={1} defaultValue={30} />
              </div>
            </CardContent>
          </Form>
        </Card>

        <DataList
          title="Listado"
          description={`${sections.length} sección(es)`}
          placeholder="Buscar por sección, grado o año…"
          emptyTitle="Sin secciones"
          emptyDescription="Crea la primera sección con el formulario."
          emptyColSpan={6}
          rows={sections.map(
            (s): DataListRow => ({
              id: s.id,
              search: `${s.name} ${s.grade.level.name} ${s.grade.name} ${s.academicYear.name}`,
              node: (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.name}</TableCell>
                  <TableCell className="text-gray-700">{s.grade.level.name} · {s.grade.name}</TableCell>
                  <TableCell className="text-gray-500">{s.academicYear.name}</TableCell>
                  <TableCell className="text-gray-700">{s._count.enrollments}</TableCell>
                  <TableCell className="text-gray-700">{s.capacity}</TableCell>
                  <TableCell>
                    <div className="flex justify-end">
                      <ConfirmDelete
                        action={deleteSection}
                        fields={{ id: s.id }}
                        title="¿Eliminar sección?"
                        description={`Se eliminará la sección ${s.name} de ${s.grade.level.name} · ${s.grade.name} (${s.academicYear.name}).`}
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
                <TableHead>Sección</TableHead>
                <TableHead>Grado</TableHead>
                <TableHead>Año académico</TableHead>
                <TableHead>Alumnos</TableHead>
                <TableHead>Capacidad</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
          }
        />
      </div>
    </div>
  );
}