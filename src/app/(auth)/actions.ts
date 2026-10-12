"use server";

import { headers } from "next/headers";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { passwordSchema } from "@/lib/password";
import { generateResetToken, hashToken } from "@/lib/reset-tokens";
import { appBaseUrl, sendMail } from "@/lib/mailer";
import { clientIp } from "@/lib/rate-limit";
import { consumeRateLimit } from "@/lib/rate-limit-store";

export type AuthFormState = { error?: string; success?: string };

const RESET_TTL_MS = 60 * 60 * 1000; // 1 hora

async function requestBaseUrl(): Promise<string> {
  const headerList = await headers();
  const host = headerList.get("host");
  const proto = headerList.get("x-forwarded-proto") ?? "http";
  return appBaseUrl(host ? `${proto}://${host}` : null);
}

export async function requestPasswordReset(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!z.string().email().safeParse(email).success) {
    return { error: "Ingresa un correo válido." };
  }

  const headerList = await headers();
  const ip = clientIp(headerList);

  try {
    const [byEmail, byIp] = await Promise.all([
      consumeRateLimit(`reset:email:${email}`, 3, RESET_TTL_MS),
      consumeRateLimit(`reset:ip:${ip}`, 10, RESET_TTL_MS),
    ]);
    if (!byEmail.ok || !byIp.ok) {
      return { error: "Demasiadas solicitudes. Intenta nuevamente más tarde." };
    }
  } catch {
    // Si el limitador falla, continuamos con el flujo normal.
  }

  const success: AuthFormState = {
    success: "Si el correo está registrado, recibirás un enlace para restablecer tu contraseña.",
  };

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, name: true, status: true },
  });
  if (!user || user.status !== "ACTIVE") return success;

  const token = generateResetToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + RESET_TTL_MS);

  try {
    await prisma.$transaction([
      prisma.passwordResetToken.deleteMany({ where: { userId: user.id } }),
      prisma.passwordResetToken.create({ data: { userId: user.id, tokenHash, expiresAt } }),
    ]);
  } catch {
    return { error: "No se pudo generar el enlace. Intenta nuevamente." };
  }

  const link = `${await requestBaseUrl()}/recuperar/${token}`;
  await sendMail({
    to: email,
    subject: "Restablece tu contraseña · Galileo EDU",
    text: `Hola ${user.name ?? ""}, restablece tu contraseña aquí: ${link} (válido 1 hora).`,
    html: `<p>Hola ${user.name ?? ""},</p><p>Recibimos una solicitud para restablecer tu contraseña.</p><p><a href="${link}">Restablecer contraseña</a></p><p>El enlace vence en 1 hora. Si no lo solicitaste, ignora este mensaje.</p>`,
  }).catch(() => {});

  return success;
}

const resetSchema = z
  .object({
    token: z.string().min(10),
    password: passwordSchema,
    confirm: z.string(),
  })
  .refine((data) => data.password === data.confirm, {
    message: "Las contraseñas no coinciden.",
    path: ["confirm"],
  });

export async function resetPassword(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = resetSchema.safeParse({
    token: formData.get("token"),
    password: formData.get("password"),
    confirm: formData.get("confirm"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const tokenHash = hashToken(parsed.data.token);
  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
    select: { id: true, userId: true, expiresAt: true, usedAt: true },
  });
  if (!record || record.usedAt || record.expiresAt < new Date()) {
    return { error: "El enlace es inválido o ha expirado. Solicita uno nuevo." };
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  try {
    await prisma.$transaction([
      prisma.user.update({
        where: { id: record.userId },
        data: { passwordHash, sessionVersion: { increment: 1 } },
      }),
      prisma.passwordResetToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
      prisma.passwordResetToken.deleteMany({
        where: { userId: record.userId, id: { not: record.id } },
      }),
    ]);
  } catch {
    return { error: "No se pudo actualizar la contraseña. Intenta nuevamente." };
  }

  return { success: "Contraseña actualizada. Ya puedes iniciar sesión." };
}
