import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/roles";
import { createGrade, deleteGrade } from "@/app/admin/_actions";
import { Badge, Card, CardContent, CardDescription, CardHeader, CardTitle, Label } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/admin/form";
import { ConfirmDelete } from "@/components/admin/confirm-delete";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LevelType } from "@/generated/prisma/client";

export const metadata = { title: "Grados" };

const LEVEL_TYPE_LABELS: Record<LevelType, string> = {
  INICIAL: "Inicial",
  PRIMARIA: "Primaria",
  SECUNDARIA: "Secundaria",
  ACADEMIA: "Academia",
};

export default async function GradesPage() {
  const session = await auth();
  const canManage = isAdmin(session?.user?.role);
  const [grades, levels] = await Promise.all([
    prisma.grade.findMany({ orderBy: [{ levelId: "asc" }, { order: "asc" }], include: { level: true } }),
    prisma.level.findMany({ orderBy: { order: "asc" } }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Grados</h1>
        <p className="text-sm text-gray-500">
          Grados o ciclos dentro de cada nivel. Ej. 1° de primaria, 3° de secundaria, curso de academia.
        </p>
      </div>

      <div className={`grid gap-6 ${canManage ? "lg:grid-cols-[320px_1fr]" : ""}`}>
        {canManage ? (
        <Card>
          <CardHeader>
            <CardTitle>Nuevo grado</CardTitle>
            <CardDescription>Asociado a un nivel.</CardDescription>
          </CardHeader>
          <Form action={createGrade} submitLabel="Crear grado">
            <CardContent className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="levelId">Nivel</Label>
                <Select id="levelId" name="levelId" required>
                  {levels.map((l) => (
                    <option key={l.id} value={l.id}>{l.name} ({LEVEL_TYPE_LABELS[l.type]})</option>
                  ))}
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="name">Nombre</Label>
                <Input id="name" name="name" required placeholder="Ej. 1° de Primaria" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="order">Orden</Label>
                <Input id="order" name="order" type="number" min={0} defaultValue={0} />
              </div>
            </CardContent>
          </Form>
        </Card>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle>Listado</CardTitle>
            <CardDescription>{grades.length} grado(s)</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Grado</TableHead>
                  <TableHead>Nivel</TableHead>
                  <TableHead>Orden</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {grades.map((g) => (
                  <TableRow key={g.id}>
                    <TableCell className="font-medium">{g.name}</TableCell>
                    <TableCell>
                      <Badge tone="gray">{LEVEL_TYPE_LABELS[g.level.type]}</Badge>
                    </TableCell>
                    <TableCell className="text-gray-500">{g.order}</TableCell>
                    <TableCell>
                      <div className="flex justify-end">
                        {canManage ? (
                        <ConfirmDelete
                          action={deleteGrade}
                          fields={{ id: g.id }}
                          title="¿Eliminar grado?"
                          description={`Se eliminará el grado ${g.name} con sus secciones y cursos.`}
                        >
                          <Button type="button" variant="destructive" size="sm">Eliminar</Button>
                        </ConfirmDelete>
                        ) : null}
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