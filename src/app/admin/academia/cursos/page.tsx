import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { createAcademyCourse, deleteAcademyCourse, toggleAcademyCourse } from "@/app/admin/_actions";
import { Badge, Card, CardContent, CardDescription, CardHeader, CardTitle, Label } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/admin/form";
import { ConfirmDelete } from "@/components/admin/confirm-delete";
import { ServerActionButton } from "@/components/admin/server-action-button";
import { TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DataList, type DataListRow } from "@/components/ui/data-list";

export const metadata = { title: "Academia · Cursos" };

export default async function AcademyCoursesPage() {
  const courses = await prisma.academyCourse.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { schedules: true, enrollments: true } } },
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Academia · Cursos</h1>
        <p className="text-sm text-gray-500">
          Cursos de la academia con sus grupos, horarios e inscritos.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Nuevo curso de academia</CardTitle>
            <CardDescription>Ej. Preparación para la UNMSM, Inglés, Fonodem.</CardDescription>
          </CardHeader>
          <Form action={createAcademyCourse} submitLabel="Crear curso">
            <CardContent className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="name">Nombre</Label>
                <Input id="name" name="name" required placeholder="Ej. Álgebra" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="description">Descripción</Label>
                <Textarea id="description" name="description" rows={3} placeholder="Opcional" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="price">Precio (S/)</Label>
                <Input id="price" name="price" type="number" min={0} step="0.01" placeholder="Ej. 180" />
              </div>
            </CardContent>
          </Form>
        </Card>

        <DataList
          title="Listado"
          description={`${courses.length} curso(s)`}
          placeholder="Buscar curso de academia…"
          emptyTitle="Sin cursos de academia"
          emptyDescription="Crea el primer curso con el formulario."
          emptyColSpan={6}
          rows={courses.map(
            (c): DataListRow => ({
              id: c.id,
              search: `${c.name} ${c.description ?? ""}`,
              node: (
                <TableRow key={c.id}>
                  <TableCell>
                    <p className="font-medium">{c.name}</p>
                    {c.description ? <p className="text-xs text-gray-500">{c.description}</p> : null}
                  </TableCell>
                  <TableCell className="text-gray-700">
                    {c.price !== null ? `S/ ${Number(c.price).toFixed(2)}` : "—"}
                  </TableCell>
                  <TableCell className="text-gray-700">{c._count.schedules}</TableCell>
                  <TableCell className="text-gray-700">{c._count.enrollments}</TableCell>
                  <TableCell>{c.active ? <Badge tone="green">Activo</Badge> : <Badge tone="gray">Inactivo</Badge>}</TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-2">
                      <Link href={`/admin/academia/cursos/${c.id}`}>
                        <Button type="button" variant="outline" size="sm">Ver</Button>
                      </Link>
                      <ServerActionButton
                        action={toggleAcademyCourse}
                        fields={{ id: c.id }}
                        variant="secondary"
                        success={c.active ? "Curso desactivado" : "Curso activado"}
                      >
                        {c.active ? "Desactivar" : "Activar"}
                      </ServerActionButton>
                      <ConfirmDelete
                        action={deleteAcademyCourse}
                        fields={{ id: c.id }}
                        title="¿Eliminar curso de academia?"
                        description={`Se eliminará ${c.name} con sus horarios e inscripciones.`}
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
                <TableHead>Precio</TableHead>
                <TableHead>Grupos</TableHead>
                <TableHead>Inscritos</TableHead>
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