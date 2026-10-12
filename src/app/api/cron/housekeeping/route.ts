import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cronAuthorized } from "@/lib/cron-auth";

/** Limpia tokens de restablecimiento y contadores de rate limiting vencidos. */
export async function GET(request: Request) {
  if (!cronAuthorized(request)) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const now = new Date();
  const [tokens, limits] = await Promise.all([
    prisma.passwordResetToken.deleteMany({
      where: { OR: [{ expiresAt: { lt: now } }, { usedAt: { not: null } }] },
    }),
    prisma.rateLimit.deleteMany({ where: { expiresAt: { lt: now } } }),
  ]);

  return NextResponse.json({
    ok: true,
    resetTokensRemoved: tokens.count,
    rateLimitsRemoved: limits.count,
  });
}
