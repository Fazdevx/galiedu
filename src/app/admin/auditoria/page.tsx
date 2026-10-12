import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/roles";
import { Badge } from "@/components/ui/card";
import { TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DataList, type DataListRow } from "@/components/ui/data-list";

export const metadata = { title: "Auditoría" };

const dateFormatter = new Intl.DateTimeFormat("es-PE", { dateStyle: "short", timeStyle: "short" });

const ACTION_TONE: Record<string, "green" | "red" | "amber" | "blue" | "gray"> = {
  create: "green",
  update: "blue",
  save: "blue",
  delete: "red",
  updateStatus: "amber",
};

function actionTone(action: string) {
  const key = action.split(".")[1] ?? "";
  return ACTION_TONE[key] ?? "gray";
}

export default async function AuditoriaPage() {
  const session = await auth();
  if (!isAdmin(session?.user?.role)) redirect("/admin");

  const logs = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 500,
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Auditoría</h1>
        <p className="text-sm text-gray-500">
          Registro de acciones sensibles del sistema (últimos 500 eventos).
        </p>
      </div>

      <DataList
        title="Eventos"
        description={`${logs.length} evento(s)`}
        placeholder="Buscar por acción, entidad o usuario…"
        emptyTitle="Sin eventos"
        emptyDescription="Aún no se registran acciones."
        emptyColSpan={5}
        pagination={25}
        rows={logs.map(
          (log): DataListRow => ({
            id: log.id,
            search: `${log.action} ${log.entity} ${log.actorEmail ?? ""}`,
            node: (
              <TableRow key={log.id}>
                <TableCell className="whitespace-nowrap text-gray-500">
                  {dateFormatter.format(log.createdAt)}
                </TableCell>
                <TableCell>
                  <Badge tone={actionTone(log.action)}>{log.action}</Badge>
                </TableCell>
                <TableCell className="text-gray-700">
                  {log.entity}
                  {log.entityId ? <span className="text-gray-400"> · {log.entityId}</span> : null}
                </TableCell>
                <TableCell className="text-gray-500">{log.actorEmail ?? "—"}</TableCell>
                <TableCell className="text-gray-400">{log.ip ?? "—"}</TableCell>
              </TableRow>
            ),
          }),
        )}
        header={
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead>Acción</TableHead>
              <TableHead>Entidad</TableHead>
              <TableHead>Usuario</TableHead>
              <TableHead>IP</TableHead>
            </TableRow>
          </TableHeader>
        }
      />
    </div>
  );
}
