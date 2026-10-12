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
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-4">
          <Link href="/login" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800">
            <ArrowLeft className="h-4 w-4" /> Volver al inicio de sesión
          </Link>
        </div>
        <Card className="animate-slide-up">
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
