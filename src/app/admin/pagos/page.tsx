import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/roles";
import { createPayment, deletePayment } from "@/app/admin/_actions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Label } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/admin/form";
import { ConfirmDelete } from "@/components/admin/confirm-delete";
import { TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DataList, type DataListRow } from "@/components/ui/data-list";
import { formatDate, todayInput } from "@/lib/date";
import { PaymentMethod } from "@/generated/prisma/client";

export const metadata = { title: "Pagos" };

const METHOD_LABELS: Record<PaymentMethod, string> = {
  EFECTIVO: "Efectivo",
  TARJETA: "Tarjeta",
  TRANSFERENCIA: "Transferencia",
  DEPOSITO: "Depósito",
  YAPE: "Yape",
  PLIN: "Plin",
};

export default async function PaymentsPage() {
  const session = await auth();
  const canManage = isAdmin(session?.user?.role);
  const [payments, students, years, concepts] = await Promise.all([
    prisma.payment.findMany({
      orderBy: { date: "desc" },
      include: { student: true, academicYear: true, concept: true },
    }),
    prisma.student.findMany({ orderBy: [{ lastName: "asc" }] }),
    prisma.academicYear.findMany({ orderBy: { year: "desc" } }),
    prisma.paymentConcept.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
  ]);

  const totalMonto = payments.reduce((acc, p) => acc + Number(p.amount), 0);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Pagos y boletas</h1>
        <p className="text-sm text-gray-500">
          {payments.length} pago(s) · Total registrado: S/ {totalMonto.toFixed(2)}
        </p>
      </div>

      <div className={`grid gap-6 ${canManage ? "xl:grid-cols-[380px_1fr]" : ""}`}>
        {canManage ? (
        <Card>
          <CardHeader>
            <CardTitle>Registrar pago</CardTitle>
            <CardDescription>Genera la boleta de pago automáticamente.</CardDescription>
          </CardHeader>
          <Form action={createPayment} submitLabel="Registrar y generar boleta">
            <CardContent className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="studentId">Alumno</Label>
                <Select id="studentId" name="studentId" required>
                  {students.map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.lastName}, {st.firstName}{st.document ? ` — ${st.document}` : ""}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="academicYearId">Año académico</Label>
                <Select id="academicYearId" name="academicYearId" required defaultValue={years.find((y) => y.isActive)?.id}>
                  {years.map((y) => (
                    <option key={y.id} value={y.id}>
                      {y.name}{y.isActive ? " (activo)" : ""}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="conceptId">Concepto</Label>
                <Select id="conceptId" name="conceptId" required>
                  {concepts.length === 0 && <option value="">— Crea conceptos primero —</option>}
                  {concepts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}{c.amount !== null ? ` (S/ ${Number(c.amount).toFixed(2)})` : ""}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="amount">Monto (S/)</Label>
                  <Input id="amount" name="amount" type="number" min={0.01} step="0.01" required placeholder="0.00" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="date">Fecha</Label>
                  <Input id="date" name="date" type="date" required defaultValue={todayInput()} />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="method">Método de pago</Label>
                <Select id="method" name="method" defaultValue="EFECTIVO">
                  {(Object.keys(METHOD_LABELS) as PaymentMethod[]).map((m) => (
                    <option key={m} value={m}>{METHOD_LABELS[m]}</option>
                  ))}
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="reference">Referencia / N° operación</Label>
                <Input id="reference" name="reference" placeholder="Opcional" />
              </div>
            </CardContent>
          </Form>
        </Card>
        ) : null}

        <DataList
          title="Historial de pagos"
          description={`${payments.length} pago(s) · Total: S/ ${totalMonto.toFixed(2)}`}
          placeholder="Buscar por recibo, alumno o concepto…"
          emptyTitle="Sin pagos registrados"
          emptyDescription="Registra el primer pago con el formulario."
          emptyColSpan={7}
          pagination={25}
          exportOptions={{
            filename: "pagos",
            columns: ["Recibo", "Fecha", "Alumno", "Concepto", "Método", "Monto"],
            rows: payments.map((p) => ({
              id: p.id,
              cells: [
                p.receiptNumber,
                formatDate(p.date),
                `${p.student.lastName}, ${p.student.firstName}`,
                p.concept.name,
                METHOD_LABELS[p.method],
                Number(p.amount).toFixed(2),
              ],
            })),
          }}
          rows={payments.map(
            (p): DataListRow => ({
              id: p.id,
              search: `${p.receiptNumber} ${p.student.lastName} ${p.student.firstName} ${p.concept.name} ${METHOD_LABELS[p.method]} ${p.date.toISOString()}`,
              node: (
                <TableRow key={p.id}>
                  <TableCell className="font-mono text-xs text-gray-600">{p.receiptNumber}</TableCell>
                  <TableCell className="text-gray-700">{formatDate(p.date)}</TableCell>
                  <TableCell className="font-medium">
                    <Link href={`/admin/alumnos/${p.student.id}`} className="hover:text-primary hover:underline">
                      {p.student.lastName}, {p.student.firstName}
                    </Link>
                  </TableCell>
                  <TableCell className="text-gray-700">{p.concept.name}</TableCell>
                  <TableCell className="text-gray-500">{METHOD_LABELS[p.method]}</TableCell>
                  <TableCell className="text-right font-semibold">S/ {Number(p.amount).toFixed(2)}</TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-2">
                      <Link href={`/admin/pagos/${p.id}/boleta`} target="_blank">
                        <Button type="button" variant="outline" size="sm">Boleta PDF</Button>
                      </Link>
                      {canManage ? (
                      <ConfirmDelete
                        action={deletePayment}
                        fields={{ id: p.id }}
                        title="¿Anular pago?"
                        description={`Se eliminará el pago ${p.receiptNumber} de S/ ${Number(p.amount).toFixed(2)} y su boleta dejará de estar disponible.`}
                        confirmLabel="Eliminar pago"
                      >
                        <Button type="button" variant="destructive" size="sm">Eliminar</Button>
                      </ConfirmDelete>
                      ) : null}
                    </div>
                  </TableCell>
                </TableRow>
              ),
            }),
          )}
          header={
            <TableHeader>
              <TableRow>
                <TableHead>N°</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Alumno</TableHead>
                <TableHead>Concepto</TableHead>
                <TableHead>Método</TableHead>
                <TableHead className="text-right">Monto</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
          }
        />
      </div>
    </div>
  );
}