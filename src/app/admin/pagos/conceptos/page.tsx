import { prisma } from "@/lib/prisma";
import { createPaymentConcept, deletePaymentConcept, togglePaymentConcept } from "@/app/admin/_actions";
import { Badge, Card, CardContent, CardDescription, CardHeader, CardTitle, Label } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/admin/form";
import { ConfirmDelete } from "@/components/admin/confirm-delete";
import { ServerActionButton } from "@/components/admin/server-action-button";
import { TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DataList, type DataListRow } from "@/components/ui/data-list";

export const metadata = { title: "Pagos · Conceptos" };

export default async function PaymentConceptsPage() {
  const concepts = await prisma.paymentConcept.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { payments: true } } },
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Pagos · Conceptos</h1>
        <p className="text-sm text-gray-500">
          Conceptos de pago configurables: matrícula, pensiones, mensualidades de academia, etc.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Nuevo concepto</CardTitle>
            <CardDescription>El monto es sugerido; al registrar se puede ajustar.</CardDescription>
          </CardHeader>
          <Form action={createPaymentConcept} submitLabel="Crear concepto">
            <CardContent className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="name">Nombre</Label>
                <Input id="name" name="name" required placeholder="Ej. Matrícula 2026" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="description">Descripción</Label>
                <Input id="description" name="description" placeholder="Opcional" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="amount">Monto sugerido (S/)</Label>
                <Input id="amount" name="amount" type="number" min={0} step="0.01" placeholder="Ej. 150" />
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-600">
                <input type="checkbox" name="recurring" className="h-4 w-4 rounded border-gray-300" />
                Concepto recurrente (ej. pensión mensual)
              </label>
            </CardContent>
          </Form>
        </Card>

        <DataList
          title="Listado"
          description={`${concepts.length} concepto(s)`}
          placeholder="Buscar concepto…"
          emptyTitle="Sin conceptos"
          emptyDescription="Crea el primer concepto con el formulario."
          emptyColSpan={5}
          rows={concepts.map(
            (c): DataListRow => ({
              id: c.id,
              search: `${c.name} ${c.description ?? ""}`,
              node: (
                <TableRow key={c.id}>
                  <TableCell>
                    <p className="font-medium">{c.name}</p>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {c.description ? <p className="text-xs text-gray-500">{c.description}</p> : null}
                      {c.recurring ? <Badge tone="blue">Recurrente</Badge> : null}
                    </div>
                  </TableCell>
                  <TableCell className="text-gray-700">
                    {c.amount !== null ? `S/ ${Number(c.amount).toFixed(2)}` : "—"}
                  </TableCell>
                  <TableCell className="text-gray-700">{c._count.payments}</TableCell>
                  <TableCell>{c.active ? <Badge tone="green">Activo</Badge> : <Badge tone="gray">Inactivo</Badge>}</TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-2">
                      <ServerActionButton
                        action={togglePaymentConcept}
                        fields={{ id: c.id }}
                        variant="secondary"
                        success={c.active ? "Concepto desactivado" : "Concepto activado"}
                      >
                        {c.active ? "Desactivar" : "Activar"}
                      </ServerActionButton>
                      <ConfirmDelete
                        action={deletePaymentConcept}
                        fields={{ id: c.id }}
                        title="¿Eliminar concepto?"
                        description={`Se eliminará el concepto ${c.name}. No se puede eliminar si tiene pagos asociados.`}
                      >
                        <Button type="button" variant="destructive" size="sm" disabled={c._count.payments > 0}>
                          Eliminar
                        </Button>
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
                <TableHead>Concepto</TableHead>
                <TableHead>Monto sugerido</TableHead>
                <TableHead>Usos</TableHead>
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