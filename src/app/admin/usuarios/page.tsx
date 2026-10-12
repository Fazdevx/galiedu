import { prisma } from "@/lib/prisma";
import { createUser, updateUserStatus, deleteUser } from "@/app/admin/_actions";
import { Badge, Card, CardContent, CardDescription, CardHeader, CardTitle, Label } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/admin/form";
import { ConfirmDelete } from "@/components/admin/confirm-delete";
import { ServerActionButton } from "@/components/admin/server-action-button";
import { TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DataList, type DataListRow } from "@/components/ui/data-list";
import { ROLE_LABELS } from "@/lib/roles";
import { PASSWORD_HINT } from "@/lib/password";
import type { Role } from "@/generated/prisma/client";

export const metadata = { title: "Usuarios" };

const roles = Object.keys(ROLE_LABELS) as Role[];

const STATUS_TONE: Record<string, "green" | "red" | "amber"> = {
  ACTIVE: "green",
  SUSPENDED: "red",
  INACTIVE: "amber",
};

export default async function UsersPage() {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Usuarios</h1>
        <p className="text-sm text-gray-500">
          Cuentas del personal, alumnos y apoderados con roles y permisos.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[360px_1fr] items-start">
        <Card>
          <CardHeader>
            <CardTitle>Nuevo usuario</CardTitle>
            <CardDescription>Se creará con acceso por correo y contraseña.</CardDescription>
          </CardHeader>
          <Form action={createUser} submitLabel="Crear usuario">
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
                <Label htmlFor="role">Rol</Label>
                <Select id="role" name="role" required defaultValue="PROFESOR">
                  {roles.map((r) => (
                    <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                  ))}
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="status">Estado</Label>
                <Select id="status" name="status" defaultValue="ACTIVE">
                  <option value="ACTIVE">Activo</option>
                  <option value="INACTIVE">Inactivo</option>
                  <option value="SUSPENDED">Suspendido</option>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="password">Contraseña inicial</Label>
                <Input id="password" name="password" type="password" required minLength={8} placeholder="Mínimo 8 caracteres" />
                <p className="text-xs text-gray-400">{PASSWORD_HINT}</p>
              </div>
            </CardContent>
          </Form>
        </Card>

        <DataList
          title="Listado"
          description={`${users.length} usuario(s)`}
          placeholder="Buscar por nombre, correo o rol…"
          emptyTitle="Sin usuarios"
          emptyDescription="Crea el primer usuario con el formulario."
          emptyColSpan={5}
          pagination={25}
          rows={users.map(
            (u): DataListRow => ({
              id: u.id,
              search: `${u.name ?? ""} ${u.email} ${ROLE_LABELS[u.role]}`,
              node: (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.name ?? "—"}</TableCell>
                  <TableCell className="text-gray-500">{u.email}</TableCell>
                  <TableCell><Badge tone="blue">{ROLE_LABELS[u.role]}</Badge></TableCell>
                  <TableCell><Badge tone={STATUS_TONE[u.status]}>{u.status}</Badge></TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-2">
                      <ServerActionButton
                        action={updateUserStatus}
                        fields={{ id: u.id, status: u.status === "ACTIVE" ? "INACTIVE" : "ACTIVE" }}
                        success={u.status === "ACTIVE" ? "Usuario desactivado" : "Usuario activado"}
                      >
                        {u.status === "ACTIVE" ? "Desactivar" : "Activar"}
                      </ServerActionButton>
                      <ConfirmDelete
                        action={deleteUser}
                        fields={{ id: u.id }}
                        title="¿Eliminar usuario?"
                        description={`Se eliminará la cuenta de ${u.name ?? u.email} y no podrá ingresar de nuevo.`}
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
                <TableHead>Usuario</TableHead>
                <TableHead>Correo</TableHead>
                <TableHead>Rol</TableHead>
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