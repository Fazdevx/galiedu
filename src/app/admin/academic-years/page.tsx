import { prisma } from "@/lib/prisma";
import { createAcademicYear, deleteAcademicYear, setActiveAcademicYear } from "@/app/admin/_actions";
import { Badge, Card, CardContent, CardDescription, CardHeader, CardTitle, Label } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/admin/form";
import { ConfirmDelete } from "@/components/admin/confirm-delete";
import { ServerActionButton } from "@/components/admin/server-action-button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate } from "@/lib/date";

export const metadata = { title: "Años académicos" };

export default async function AcademicYearsPage() {
  const years = await prisma.academicYear.findMany({ orderBy: { year: "desc" } });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Años académicos</h1>
        <p className="text-sm text-gray-500">
          Organiza las campañas por año. Una promoción de Inicial, Primaria, Secundaria y Academia se apoya cada año en este registro.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Nuevo año académico</CardTitle>
            <CardDescription>Ej. 2025 – “Año 2025”</CardDescription>
          </CardHeader>
          <Form action={createAcademicYear} submitLabel="Crear año">
            <CardContent className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="year">Año</Label>
                <Input id="year" name="year" type="number" min={2000} max={2100} required placeholder="2025" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="name">Nombre</Label>
                <Input id="name" name="name" required placeholder="Año académico 2025" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="startDate">Inicio</Label>
                <Input id="startDate" name="startDate" type="date" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="endDate">Fin</Label>
                <Input id="endDate" name="endDate" type="date" />
              </div>
            </CardContent>
          </Form>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Listado</CardTitle>
            <CardDescription>{years.length} año(s) registrado(s)</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Año</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Periodo</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {years.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-gray-400">
                      Sin años registrados todavía.
                    </TableCell>
                  </TableRow>
                )}
                {years.map((y) => (
                  <TableRow key={y.id}>
                    <TableCell className="font-medium">{y.year}</TableCell>
                    <TableCell>{y.name}</TableCell>
                    <TableCell className="text-gray-500">
                      {y.startDate ? formatDate(y.startDate) : "—"} a {y.endDate ? formatDate(y.endDate) : "—"}
                    </TableCell>
                    <TableCell>{y.isActive ? <Badge tone="green">Activo</Badge> : <Badge tone="gray">Inactivo</Badge>}</TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-2">
                        {!y.isActive && (
                          <ServerActionButton
                            action={setActiveAcademicYear}
                            fields={{ id: y.id }}
                            success="Año académico activado"
                          >
                            Activar
                          </ServerActionButton>
                        )}
                        <ConfirmDelete
                          action={deleteAcademicYear}
                          fields={{ id: y.id }}
                          title="¿Eliminar año académico?"
                          description={`Se eliminará ${y.name} con sus secciones, matrículas, asistencias y pagos.`}
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