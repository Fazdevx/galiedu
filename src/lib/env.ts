import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().url("DATABASE_URL debe ser una URL de conexión válida."),
  DIRECT_URL: z.string().url("DIRECT_URL debe ser una URL de conexión válida.").optional(),
  AUTH_SECRET: z.string().min(32, "AUTH_SECRET debe tener al menos 32 caracteres."),
  AUTH_URL: z.string().url("AUTH_URL debe ser una URL válida.").optional(),
  NEXT_PUBLIC_APP_NAME: z.string().min(1).optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const details = parsed.error.issues
    .map((issue) => `  - ${issue.path.join(".") || "(raíz)"}: ${issue.message}`)
    .join("\n");
  throw new Error(`Variables de entorno inválidas o faltantes:\n${details}`);
}

export const env = parsed.data;
