import NextAuth, { CredentialsSignin } from "next-auth";
import { z } from "zod";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import type { Role } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { clientIp, createRateLimiter } from "@/lib/rate-limit";
import { consumeRateLimit, resetRateLimit } from "@/lib/rate-limit-store";
import { authConfig } from "@/auth.config";

class RateLimited extends CredentialsSignin {
  code = "rate_limited";
}

// Límites de intentos de login por ventana de 15 minutos.
const WINDOW_MS = 15 * 60_000;
const EMAIL_LIMIT = 5;
const IP_LIMIT = 20;

// Respaldo en memoria: solo se usa si el limitador persistente falla.
const emailLimiter = createRateLimiter(EMAIL_LIMIT, WINDOW_MS);
const ipLimiter = createRateLimiter(IP_LIMIT, WINDOW_MS);

async function isRateLimited(emailKey: string, ipKey: string): Promise<boolean> {
  try {
    const [byEmail, byIp] = await Promise.all([
      consumeRateLimit(emailKey, EMAIL_LIMIT, WINDOW_MS),
      consumeRateLimit(ipKey, IP_LIMIT, WINDOW_MS),
    ]);
    return !byEmail.ok || !byIp.ok;
  } catch {
    return !emailLimiter.check(emailKey).ok || !ipLimiter.check(ipKey).ok;
  }
}

async function clearEmailLimit(emailKey: string): Promise<void> {
  try {
    await resetRateLimit(emailKey);
  } catch {
    emailLimiter.reset(emailKey);
  }
}

// Ventana de revalidación de la sesión (revocación por estado/rol).
const SESSION_RECHECK_MS = 60_000;

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  providers: [
    Credentials({
      name: "Credenciales",
      credentials: {
        email: { label: "Correo", type: "email" },
        password: { label: "Contraseña", type: "password" },
      },
      async authorize(credentials, request) {
        const parsed = z
          .object({
            email: z.string().email(),
            password: z.string().min(1),
          })
          .safeParse(credentials);

        if (!parsed.success) return null;

        const email = parsed.data.email.toLowerCase();
        const emailKey = `login:email:${email}`;
        const ipKey = `login:ip:${clientIp(request)}`;

        if (await isRateLimited(emailKey, ipKey)) {
          throw new RateLimited();
        }

        const user = await prisma.user.findUnique({ where: { email } });

        if (!user?.passwordHash) return null;
        if (user.status !== "ACTIVE") return null;

        const passwordValid = await bcrypt.compare(
          parsed.data.password,
          user.passwordHash,
        );
        if (!passwordValid) return null;

        await clearEmailLimit(emailKey);

        return {
          id: user.id,
          email: user.email,
          name: user.name ?? user.email,
          role: user.role,
          sessionVersion: user.sessionVersion,
        };
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role as Role;
        token.sessionVersion = user.sessionVersion ?? 0;
        token.checkedAt = Date.now();
        return token;
      }

      // Revalida periódicamente contra la base de datos para revocar sesiones
      // cuando el usuario cambia de estado/rol o se restablece su contraseña.
      const id = token.id ?? token.sub;
      if (!id) return token;

      const checkedAt = typeof token.checkedAt === "number" ? token.checkedAt : 0;
      if (Date.now() - checkedAt < SESSION_RECHECK_MS) return token;

      const fresh = await prisma.user.findUnique({
        where: { id: String(id) },
        select: { status: true, role: true, sessionVersion: true },
      });

      if (
        !fresh ||
        fresh.status !== "ACTIVE" ||
        fresh.sessionVersion !== (token.sessionVersion ?? 0)
      ) {
        return null; // invalida la sesión
      }

      token.role = fresh.role;
      token.checkedAt = Date.now();
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = String(token.id ?? token.sub ?? "");
        session.user.role = (token.role as Role) ?? "ALUMNO";
      }
      return session;
    },
  },
});
