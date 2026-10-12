import { prisma } from "@/lib/prisma";
import { createCourse, deleteCourse } from "@/app/admin/_actions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Label } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/admin/form";
import { ConfirmDelete } from "@/components/admin/confirm-delete";
import { TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DataList, type DataListRow } from "@/components/ui/data-list";
import { LevelType } from "@/generated/prisma/client";

export const metadata = { title: "Cursos" };

const LEVEL_TYPE_LABELS: Record<LevelType, string> = {
  INICIAL: "Inicial",
  PRIMARIA: "Primaria",
  SECUNDARIA: "Secundaria",
  ACADEMIA: "Academia",
};

export default async function CoursesPage() {
  const [courses, grades] = await Promise.all([
    prisma.course.findMany({
      orderBy: [{ grade: { level: { order: "asc" } } }, { grade: { order: "asc" } }, { order: "asc" }],
      include: { grade: { include: { level: true } } },
    }),
    prisma.grade.findMany({ orderBy: [{ level: { order: "asc" } }, { order: "asc" }], include: { level: true } }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Cursos</h1>
        <p className="text-sm text-gray-500">
          Asignaturas por grado. Las notas se registran sobre estos cursos.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Nuevo curso</CardTitle>
            <CardDescription>Vincular a un grado.</CardDescription>
          </CardHeader>
          <Form action={createCourse} submitLabel="Crear curso">
            <CardContent className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="gradeId">Grado</Label>
                <Select id="gradeId" name="gradeId" required>
                  {grades.map((g) => (
                    <option key={g.id} value={g.id}>{g.level.name} · {g.name}</option>
                  ))}
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="name">Asignatura</Label>
                <Input id="name" name="name" required placeholder="Ej. Matemática" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="order">Orden</Label>
                <Input id="order" name="order" type="number" min={0} defaultValue={0} />
              </div>
            </CardContent>
          </Form>
        </Card>

        <DataList
          title="Listado"
          description={`${courses.length} curso(s)`}
          placeholder="Buscar por curso, nivel o grado…"
          emptyTitle="Sin cursos"
          emptyDescription="Crea el primer curso con el formulario."
          emptyColSpan={5}
          rows={courses.map(
            (c): DataListRow => ({
              id: c.id,
              search: `${c.name} ${LEVEL_TYPE_LABELS[c.grade.level.type]} ${c.grade.name}`,
              node: (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell><span className="text-gray-500">{LEVEL_TYPE_LABELS[c.grade.level.type]}</span></TableCell>
                  <TableCell className="text-gray-700">{c.grade.name}</TableCell>
                  <TableCell className="text-gray-500">{c.order}</TableCell>
                  <TableCell>
                    <div className="flex justify-end">
                      <ConfirmDelete
                        action={deleteCourse}
                        fields={{ id: c.id }}
                        title="¿Eliminar curso?"
                        description={`Se eliminará el curso ${c.name} (${c.grade.name}) con sus notas.`}
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
                <TableHead>Curso</TableHead>
                <TableHead>Nivel</TableHead>
                <TableHead>Grado</TableHead>
                <TableHead>Orden</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
          }
        />
      </div>
    </div>
  );
}