export type RateLimitResult = { ok: boolean; retryAfterMs: number };

type Bucket = { count: number; resetAt: number };

/**
 * Limitador en memoria por ventana fija. Suficiente para una sola instancia
 * del servidor; en despliegues multi-instancia conviene moverlo a Redis/BD.
 */
export function createRateLimiter(limit: number, windowMs: number) {
  const buckets = new Map<string, Bucket>();
  let lastPrune = 0;

  function prune(now: number) {
    if (now - lastPrune < windowMs) return;
    for (const [key, bucket] of buckets) {
      if (bucket.resetAt <= now) buckets.delete(key);
    }
    lastPrune = now;
  }

  return {
    /** Registra un intento para `key`. Devuelve ok=false al superar el límite. */
    check(key: string, now: number = Date.now()): RateLimitResult {
      prune(now);
      const bucket = buckets.get(key);
      if (!bucket || bucket.resetAt <= now) {
        buckets.set(key, { count: 1, resetAt: now + windowMs });
        return { ok: true, retryAfterMs: 0 };
      }
      bucket.count += 1;
      if (bucket.count > limit) return { ok: false, retryAfterMs: bucket.resetAt - now };
      return { ok: true, retryAfterMs: 0 };
    },

    /** Limpia el contador de una clave (p. ej. tras un login correcto). */
    reset(key: string) {
      buckets.delete(key);
    },
  };
}

/** IP del cliente a partir de las cabeceras de proxy habituales. */
export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}
