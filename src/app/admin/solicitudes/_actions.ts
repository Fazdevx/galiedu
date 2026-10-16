"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { generateResetToken, hashToken } from "@/lib/reset-tokens";
import { appBaseUrl, sendMail } from "@/lib/mailer";
import type { FormState } from "@/app/admin/_actions";

const OK: FormState = {};
const DENIED: FormState = { error: "No tienes permisos para realizar esta acción." };

// El enlace de activación dura más que un reset normal: el usuario recién creado aún no tiene contraseña.
const ACTIVATION_TTL_MS = 24 * 60 * 60 * 1000;

async function requestBaseUrl(): Promise<string> {
  const headerList = await headers();
  const host = headerList.get("host");
  const proto = headerList.get("x-forwarded-proto") ?? "http";
  return appBaseUrl(host ? `${proto}://${host}` : null);
}

// Roles que el director puede solicitar (nunca SUPER_ADMIN: ese rol solo lo crea el SUPER_ADMIN).
const REQUESTABLE_ROLES = ["ADMIN", "DIRECTOR", "COORDINADOR", "PROFESOR", "ALUMNO", "APODERADO"] as const;

const requestSchema = z.object({
  name: z.string().min(2).max(150),
  email: z.string().email(),
  role: z.enum(REQUESTABLE_ROLES),
  notes: z.string().max(300).optional().or(z.literal("")),
});

export async function createUserRequest(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await auth();
  if (session?.user?.role !== "DIRECTOR") {
    return { error: "Solo el director puede enviar solicitudes de creación de usuario." };
  }

  const parsed = requestSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    role: formData.get("role"),
    notes: formData.get("notes"),
  });
  if (!parsed.success) return { error: `Datos inválidos. ${parsed.error.issues[0]?.message ?? "Revisa los campos."}` };

  const email = parsed.data.email.toLowerCase();

  const existingUser = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (existingUser) return { error: "Ya existe una cuenta con ese correo." };

  const pending = await prisma.userCreateRequest.findFirst({
    where: { email, status: "PENDING" },
    select: { id: true },
  });
  if (pending) return { error: "Ya existe una solicitud pendiente para ese correo." };

  try {
    await prisma.userCreateRequest.create({
      data: {
        name: parsed.data.name,
        email,
        role: parsed.data.role,
        notes: parsed.data.notes || null,
        requestedById: session.user.id,
      },
    });
  } catch {
    return { error: "No se pudo registrar la solicitud." };
  }

  await logAudit({
    action: "userRequest.create",
    entity: "UserCreateRequest",
    entityId: email,
    metadata: { role: parsed.data.role },
  });
  revalidatePath("/admin/solicitudes");
  return { success: "Solicitud enviada. El super administrador la revisará." };
}

function formString(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

export async function approveUserRequest(formData: FormData): Promise<FormState> {
  const session = await auth();
  if (session?.user?.role !== "SUPER_ADMIN") return DENIED;

  const id = formString(formData, "id");
  if (!id) return { error: "Solicitud no válida." };

  const request = await prisma.userCreateRequest.findUnique({ where: { id } });
  if (!request) return { error: "Solicitud no encontrada." };
  if (request.status !== "PENDING") return { error: "La solicitud ya fue resuelta." };

  const email = request.email.toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) return { error: "Ya existe una cuenta con ese correo; rechaza la solicitud." };

  // Hash de una contraseña aleatoria: no es conocida por nadie; el usuario define la suya por el enlace.
  const temporaryHash = await bcrypt.hash(randomBytes(32).toString("hex"), 10);

  let userId: string;
  try {
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name: request.name,
          email,
          role: request.role,
          status: "ACTIVE",
          passwordHash: temporaryHash,
        },
      });
      await tx.userCreateRequest.update({
        where: { id },
        data: { status: "APPROVED", resolvedById: session.user.id, resolvedAt: new Date() },
      });
      return user;
    });
    userId = result.id;
  } catch {
    return { error: "No se pudo crear el usuario (correo ya registrado)." };
  }

  // Enlace de activación por correo (best effort: si falla, se puede usar "¿Olvidaste tu contraseña?").
  const token = generateResetToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + ACTIVATION_TTL_MS);
  try {
    await prisma.$transaction([
      prisma.passwordResetToken.deleteMany({ where: { userId } }),
      prisma.passwordResetToken.create({ data: { userId, tokenHash, expiresAt } }),
    ]);
    const link = `${await requestBaseUrl()}/recuperar/${token}`;
    await sendMail({
      to: email,
      subject: "Tu cuenta en Galileo EDU está lista · Define tu contraseña",
      text: `Hola ${request.name}, se creó tu cuenta con el rol ${request.role}. Define tu contraseña aquí: ${link} (válido 24 horas).`,
      html: `<p>Hola ${request.name},</p>
<p>Tu cuenta en <strong>Galileo EDU</strong> fue creada con el rol <strong>${request.role}</strong>.</p>
<p><a href="${link}">Definir mi contraseña</a></p>
<p>El enlace vence en 24 horas. Si no esperabas esta cuenta, ignora este mensaje.</p>`,
    }).catch(() => {});
  } catch {
    // Best effort.
  }

  await logAudit({
    action: "userRequest.approve",
    entity: "UserCreateRequest",
    entityId: id,
    metadata: { email, role: request.role },
  });
  revalidatePath("/admin/solicitudes");
  revalidatePath("/admin/usuarios");
  return { success: `Usuario creado. Se envió el enlace de activación a ${email}.` };
}

export async function rejectUserRequest(formData: FormData): Promise<FormState> {
  const session = await auth();
  if (session?.user?.role !== "SUPER_ADMIN") return DENIED;

  const id = formString(formData, "id");
  const reason = formString(formData, "reason");
  if (!id) return { error: "Solicitud no válida." };
  if (reason.length < 3) return { error: "Indica un motivo de rechazo (mínimo 3 caracteres)." };

  const request = await prisma.userCreateRequest.findUnique({ where: { id } });
  if (!request) return { error: "Solicitud no encontrada." };
  if (request.status !== "PENDING") return { error: "La solicitud ya fue resuelta." };

  try {
    await prisma.userCreateRequest.update({
      where: { id },
      data: {
        status: "REJECTED",
        rejectReason: reason,
        resolvedById: session.user.id,
        resolvedAt: new Date(),
      },
    });
  } catch {
    return { error: "No se pudo rechazar la solicitud." };
  }

  await logAudit({
    action: "userRequest.reject",
    entity: "UserCreateRequest",
    entityId: id,
    metadata: { email: request.email, reason },
  });
  revalidatePath("/admin/solicitudes");
  return OK;
}
