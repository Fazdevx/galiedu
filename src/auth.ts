import NextAuth, { CredentialsSignin } from "next-auth";
import { z } from "zod";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import type { Role } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { clientIp, createRateLimiter } from "@/lib/rate-limit";
import { authConfig } from "@/auth.config";

class RateLimited extends CredentialsSignin {
  code = "rate_limited";
}

// Límites de intentos de login por ventana de 15 minutos.
const emailLimiter = createRateLimiter(5, 15 * 60_000);
const ipLimiter = createRateLimiter(20, 15 * 60_000);

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
            password: z.string().min(6),
          })
          .safeParse(credentials);

        if (!parsed.success) return null;

        const email = parsed.data.email.toLowerCase();
        const emailKey = `email:${email}`;
        const ipKey = `ip:${clientIp(request)}`;

        if (!emailLimiter.check(emailKey).ok || !ipLimiter.check(ipKey).ok) {
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

        emailLimiter.reset(emailKey);

        return {
          id: user.id,
          email: user.email,
          name: user.name ?? user.email,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role as Role;
      }
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