import { createHash, randomBytes } from "node:crypto";

/** Token de restablecimiento (se envía al usuario por correo). */
export function generateResetToken(): string {
  return randomBytes(32).toString("hex");
}

/** Hash determinista del token; solo el hash se guarda en la base de datos. */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
