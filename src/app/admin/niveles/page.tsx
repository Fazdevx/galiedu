import { prisma } from "@/lib/prisma";
import { createLevel, deleteLevel } from "@/app/admin/_actions";
import { Badge, Card, CardContent, CardDescription, CardHeader, CardTitle, Label } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/admin/form";
import { ConfirmDelete } from "@/components/admin/confirm-delete";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LevelType } from "@/generated/prisma/client";

export const metadata = { title: "Niveles" };

const LEVEL_TYPE_LABELS: Record<LevelType, string> = {
  INICIAL: "Inicial",
  PRIMARIA: "Primaria",
  SECUNDARIA: "Secundaria",
  ACADEMIA: "Academia",
};

const LEVEL_TYPE_TONES: Record<LevelType, "blue" | "green" | "amber" | "gray"> = {
  INICIAL: "blue",
  PRIMARIA: "green",
  SECUNDARIA: "amber",
  ACADEMIA: "gray",
};

export default async function LevelsPage() {
  const levels = await prisma.level.findMany({
    orderBy: { order: "asc" },
    include: { grades: true },
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Niveles</h1>
        <p className="text-sm text-gray-500">
          Inicial, Primaria, Secundaria y la Academia. Todo personalizable desde aquí.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Nuevo nivel</CardTitle>
            <CardDescription>El tipo es único y define el flujo del sistema.</CardDescription>
          </CardHeader>
          <Form action={createLevel} submitLabel="Crear nivel">
            <CardContent className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="type">Tipo</Label>
                <Select id="type" name="type" required defaultValue="INICIAL">
                  {Object.entries(LEVEL_TYPE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="name">Nombre</Label>
                <Input id="name" name="name" required placeholder="Ej. Educación Inicial" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="order">Orden</Label>
                <Input id="order" name="order" type="number" min={0} defaultValue={0} />
              </div>
            </CardContent>
          </Form>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Listado</CardTitle>
            <CardDescription>{levels.length} nivel(es)</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nivel</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Grados</TableHead>
                  <TableHead>Orden</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {levels.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell className="font-medium">{l.name}</TableCell>
                    <TableCell><Badge tone={LEVEL_TYPE_TONES[l.type]}>{LEVEL_TYPE_LABELS[l.type]}</Badge></TableCell>
                    <TableCell className="text-gray-500">{l.grades.length}</TableCell>
                    <TableCell className="text-gray-500">{l.order}</TableCell>
                    <TableCell>
                      <div className="flex justify-end">
                        <ConfirmDelete
                          action={deleteLevel}
                          fields={{ id: l.id }}
                          title="¿Eliminar nivel?"
                          description={`Se eliminará el nivel ${l.name} junto con sus ${l.grades.length} grado(s).`}
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