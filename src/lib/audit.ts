import { headers } from "next/headers";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";

export type AuditEntry = {
  action: string;
  entity: string;
  entityId?: string | null;
  metadata?: Prisma.InputJsonValue;
};

/** Registra una acción sensible en el log de auditoría. Nunca lanza. */
export async function logAudit(entry: AuditEntry): Promise<void> {
  try {
    const session = await auth();
    const headerList = await headers();
    const forwarded = headerList.get("x-forwarded-for");
    const ip = forwarded?.split(",")[0]?.trim() || headerList.get("x-real-ip") || null;

    await prisma.auditLog.create({
      data: {
        userId: session?.user?.id ?? null,
        actorEmail: session?.user?.email ?? null,
        action: entry.action,
        entity: entry.entity,
        entityId: entry.entityId ?? null,
        metadata: entry.metadata,
        ip,
      },
    });
  } catch {
    // El registro de auditoría nunca debe romper la acción principal.
  }
}
