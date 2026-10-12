import nodemailer, { type Transporter } from "nodemailer";
import { env } from "@/lib/env";

let transporter: Transporter | null = null;

function getTransporter(): Transporter | null {
  if (!env.SMTP_HOST) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT ?? 587,
      secure: env.SMTP_SECURE === "true",
      auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
    });
  }
  return transporter;
}

export type MailInput = { to: string; subject: string; html: string; text?: string };

/** Envía un correo. Si SMTP no está configurado, lo registra en consola. */
export async function sendMail(input: MailInput): Promise<{ sent: boolean }> {
  const active = getTransporter();
  const from = env.SMTP_FROM ?? env.SMTP_USER ?? "no-reply@galileo.edu.pe";

  if (!active) {
    console.info(`[mailer] SMTP no configurado. Correo a ${input.to}: ${input.subject}`);
    return { sent: false };
  }

  await active.sendMail({
    from,
    to: input.to,
    subject: input.subject,
    html: input.html,
    text: input.text,
  });
  return { sent: true };
}

/** URL base de la aplicación para construir enlaces en correos. */
export function appBaseUrl(fallback?: string | null): string {
  if (env.AUTH_URL) return env.AUTH_URL.replace(/\/$/, "");
  if (fallback) return fallback.replace(/\/$/, "");
  return "http://localhost:3000";
}
