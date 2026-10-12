import { env } from "@/lib/env";

/** Autoriza una petición de tarea programada mediante Bearer CRON_SECRET. */
export function cronAuthorized(request: Request): boolean {
  if (!env.CRON_SECRET) return false;
  return request.headers.get("authorization") === `Bearer ${env.CRON_SECRET}`;
}
