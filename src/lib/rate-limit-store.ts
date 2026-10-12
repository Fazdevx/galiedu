import { prisma } from "@/lib/prisma";
import type { RateLimitResult } from "@/lib/rate-limit";

/**
 * Limitador de ventana fija persistido en Postgres. Funciona entre múltiples
 * instancias del servidor (sin estado en memoria).
 */
export async function consumeRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): Promise<RateLimitResult> {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + windowMs);

  const rows = await prisma.$queryRaw<Array<{ count: number; expiresAt: Date }>>`
    INSERT INTO "rate_limits" ("key", "count", "expiresAt")
    VALUES (${key}, 1, ${expiresAt})
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE WHEN "rate_limits"."expiresAt" <= ${now} THEN 1 ELSE "rate_limits"."count" + 1 END,
      "expiresAt" = CASE WHEN "rate_limits"."expiresAt" <= ${now} THEN ${expiresAt} ELSE "rate_limits"."expiresAt" END
    RETURNING "count", "expiresAt"
  `;

  const row = rows[0];
  if (!row) return { ok: true, retryAfterMs: 0 };

  const ok = row.count <= limit;
  const retryAfterMs = ok ? 0 : Math.max(0, new Date(row.expiresAt).getTime() - now.getTime());
  return { ok, retryAfterMs };
}

/** Limpia el contador de una clave (p. ej. tras un login correcto). */
export async function resetRateLimit(key: string): Promise<void> {
  await prisma.$queryRaw`DELETE FROM "rate_limits" WHERE "key" = ${key}`;
}
