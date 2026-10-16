import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ROLE_LABELS } from "@/lib/roles";
import { createUserRequest, approveUserRequest, rejectUserRequest } from "./_actions";
import { Badge, Card, CardContent, CardDescription, CardHeader, CardTitle, Label } from "@/components/ui/card";
import { Input, Select, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/admin/form";
import { ServerActionButton } from "@/components/admin/server-action-button";
import { ConfirmReject } from "@/components/admin/confirm-reject";
import { TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DataList, type DataListRow } from "@/components/ui/data-list";
import type { Role } from "@/generated/prisma/client";

export const metadata = { title: "Solicitudes de usuario" };

const REQUESTABLE_ROLES: Role[] = ["ADMIN", "DIRECTOR", "COORDINADOR", "PROFESOR", "ALUMNO", "APODERADO"];

const STATUS_TONE: Record<string, "green" | "red" | "amber"> = {
  PENDING: "amber",
  APPROVED: "green",
  REJECTED: "red",
};

const STATUS_LABEL: Record<string, string> = {
  PENDING: "Pendiente",
  APPROVED: "Aprobada",
  REJECTED: "Rechazada",
};

const dateFormatter = new Intl.DateTimeFormat("es-PE", { dateStyle: "short", timeStyle: "short" });

export default async function SolicitudesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const role = session.user.role;
  const isDirector = role === "DIRECTOR";
  const isAdminLike = role === "SUPER_ADMIN" || role === "ADMIN";
  if (!isDirector && !isAdminLike) {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Solicitudes de usuario</h1>
        </div>
        <Card>
          <CardContent className="p-6 text-sm text-gray-500">
            Solo el director puede solicitar la creación de usuarios. Si necesitas una cuenta, solicítala a tu director
            o al super administrador.
          </CardContent>
        </Card>
      </div>
    );
  }

  const requests = await prisma.userCreateRequest.findMany({
    where: isDirector ? { requestedById: session.user.id } : undefined,
    orderBy: { createdAt: "desc" },
    include: {
      requestedBy: { select: { name: true, email: true } },
      resolvedBy: { select: { name: true, email: true } },
    },
  });

  function resolutionText(r: (typeof requests)[number]) {
    if (r.status === "PENDING") return "—";
    const by = r.resolvedBy?.name ?? r.resolvedBy?.email ?? "—";
    const at = r.resolvedAt ? dateFormatter.format(r.resolvedAt) : "";
    const reason = r.status === "REJECTED" && r.rejectReason ? ` · ${r.rejectReason}` : "";
    return `${by} · ${at}${reason}`;
  }

  const rows = requests.map(
    (r): DataListRow => ({
      id: r.id,
      search: `${r.name} ${r.email} ${ROLE_LABELS[r.role]} ${r.notes ?? ""} ${STATUS_LABEL[r.status]}`,
      node: (
        <TableRow key={r.id}>
          {isDirector ? null : (
            <TableCell className="text-gray-500">{r.requestedBy.name ?? r.requestedBy.email}</TableCell>
          )}
          <TableCell className="font-medium">{r.name}</TableCell>
          <TableCell className="text-gray-500">{r.email}</TableCell>
          <TableCell>
            <Badge tone="blue">{ROLE_LABELS[r.role]}</Badge>
          </TableCell>
          <TableCell>
            <Badge tone={STATUS_TONE[r.status]}>{STATUS_LABEL[r.status]}</Badge>
          </TableCell>
          <TableCell className="max-w-48 truncate text-gray-500" title={r.notes ?? undefined}>
            {r.notes ?? "—"}
          </TableCell>
          <TableCell className="text-gray-500">{resolutionText(r)}</TableCell>
          {isDirector || role !== "SUPER_ADMIN" ? (
            <TableCell />
          ) : (
            <TableCell>
              <div className="flex items-center justify-end gap-2">
                {r.status === "PENDING" ? (
                  <>
                    <ServerActionButton
                      action={approveUserRequest}
                      fields={{ id: r.id }}
                      success="Usuario creado y correo de activación enviado"
                    >
                      Aprobar
                    </ServerActionButton>
                    <ConfirmReject action={rejectUserRequest} fields={{ id: r.id }}>
                      <Button type="button" variant="destructive" size="sm">
                        Rechazar
                      </Button>
                    </ConfirmReject>
                  </>
                ) : null}
              </div>
            </TableCell>
          )}
        </TableRow>
      ),
    }),
  );

  const header = (
    <TableHeader>
      <TableRow>
        {isDirector ? null : <TableHead>Solicitante</TableHead>}
        <TableHead>Nombre</TableHead>
        <TableHead>Correo</TableHead>
        <TableHead>Rol solicitado</TableHead>
        <TableHead>Estado</TableHead>
        <TableHead>Notas</TableHead>
        <TableHead>Resolución</TableHead>
        <TableHead className="text-right">Acciones</TableHead>
      </TableRow>
    </TableHeader>
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Solicitudes de usuario</h1>
        <p className="text-sm text-gray-500">
          {isDirector
            ? "Solicita la creación de cuentas; el super administrador las revisará y el usuario recibirá un correo para definir su contraseña."
            : "Solicitudes enviadas por el director. Solo el super administrador puede aprobarlas o rechazarlas."}
        </p>
      </div>

      <div className={`grid gap-6 items-start ${isDirector ? "lg:grid-cols-[360px_1fr]" : ""}`}>
        {isDirector ? (
          <Card>
            <CardHeader>
              <CardTitle>Solicitar usuario</CardTitle>
              <CardDescription>Indica los datos y el rol deseado de la cuenta a crear.</CardDescription>
            </CardHeader>
            <Form action={createUserRequest} submitLabel="Enviar solicitud">
              <CardContent className="flex flex-col gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="name">Nombre completo</Label>
                  <Input id="name" name="name" required placeholder="Ej. María Quispe" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="email">Correo</Label>
                  <Input id="email" name="email" type="email" required placeholder="correo@colegio.edu.pe" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="role">Rol solicitado</Label>
                  <Select id="role" name="role" required defaultValue="PROFESOR">
                    {REQUESTABLE_ROLES.map((r) => (
                      <option key={r} value={r}>
                        {ROLE_LABELS[r]}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="notes">Motivo / notas</Label>
                  <Textarea
                    id="notes"
                    name="notes"
                    maxLength={300}
                    placeholder="Ej. Profesor de Ciencias para 3° de Secundaria"
                  />
                </div>
              </CardContent>
            </Form>
          </Card>
        ) : null}

        <DataList
          title={isDirector ? "Mis solicitudes" : "Todas las solicitudes"}
          description={`${requests.length} solicitud(es)`}
          placeholder="Buscar por nombre, correo, rol o estado…"
          emptyTitle="Sin solicitudes"
          emptyDescription={
            isDirector
              ? "Usa el formulario para solicitar la creación de una cuenta."
              : "El director aún no ha enviado solicitudes."
          }
          emptyColSpan={isDirector ? 7 : 8}
          pagination={25}
          rows={rows}
          header={header}
        />
      </div>
    </div>
  );
}
