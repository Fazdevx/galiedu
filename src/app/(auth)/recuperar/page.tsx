import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RequestResetForm } from "@/components/password-reset-forms";

export const metadata: Metadata = {
  title: "Recuperar contraseña",
};

export default function RecuperarPage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-gradient-to-b from-primary-soft/50 to-transparent"
      />
      <div className="relative w-full max-w-sm">
        <div className="mb-4">
          <Link href="/login" className="inline-flex items-center gap-1.5 text-sm text-gray-500 transition-colors hover:text-gray-800">
            <ArrowLeft className="h-4 w-4" /> Volver al inicio de sesión
          </Link>
        </div>
        <Card className="animate-slide-up border-gray-200/80 shadow-raised">
          <CardHeader>
            <CardTitle>Recuperar contraseña</CardTitle>
            <CardDescription>Te enviaremos un enlace para restablecer tu contraseña.</CardDescription>
          </CardHeader>
          <CardContent>
            <RequestResetForm />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
