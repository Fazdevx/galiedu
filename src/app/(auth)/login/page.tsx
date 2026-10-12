import type { Metadata } from "next";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, BookOpen, ShieldCheck, Users } from "lucide-react";
import { LoginForm } from "@/components/login-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { isStaff } from "@/lib/roles";
import { getSchoolSettings } from "@/lib/settings";

export const metadata: Metadata = {
  title: "Iniciar sesión",
};

const FEATURES = [
  { icon: Users, text: "Gestión de alumnos, matrículas y familias" },
  { icon: BookOpen, text: "Notas, asistencia y boletines en PDF" },
  { icon: ShieldCheck, text: "Pagos, boletas y portal de apoderados" },
];

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) {
    redirect(isStaff(session.user.role) ? "/admin" : "/portal");
  }

  const school = await getSchoolSettings();

  return (
    <main className="grid min-h-screen bg-gray-50 lg:grid-cols-2">
      <section
        className="relative hidden flex-col justify-between overflow-hidden p-10 text-white lg:flex"
        style={{ backgroundColor: school.primaryColor }}
      >
        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/10" />
        <div className="absolute -bottom-24 -left-10 h-72 w-72 rounded-full bg-black/10" />
        <div className="relative flex items-center gap-3">
          {school.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={school.logoUrl} alt={school.shortName} className="h-11 w-11 rounded-xl bg-white object-contain p-1" />
          ) : (
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15 text-xl font-bold">
              {school.shortName.charAt(0)}
            </div>
          )}
          <div>
            <p className="text-lg font-semibold leading-tight">{school.shortName}</p>
            <p className="text-sm text-white/70">{school.slogan ?? "Plataforma de gestión escolar"}</p>
          </div>
        </div>

        <div className="relative flex flex-col gap-5">
          <h1 className="max-w-md text-3xl font-bold leading-tight">{school.name}</h1>
          <ul className="flex flex-col gap-3">
            {FEATURES.map((f) => {
              const Icon = f.icon;
              return (
                <li key={f.text} className="flex items-center gap-3 text-sm text-white/90">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/15">
                    <Icon className="h-4 w-4" />
                  </span>
                  {f.text}
                </li>
              );
            })}
          </ul>
        </div>

        <p className="relative text-xs text-white/60">© {new Date().getFullYear()} {school.name}</p>
      </section>

      <section className="flex flex-col items-center justify-center px-4 py-12">
        <div className="mb-4 w-full max-w-sm">
          <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800">
            <ArrowLeft className="h-4 w-4" /> Volver al inicio
          </Link>
        </div>
        <Card className="w-full max-w-sm animate-slide-up">
          <CardHeader className="items-center text-center">
            <div
              className="mb-2 flex h-12 w-12 items-center justify-center rounded-xl text-xl font-bold text-white lg:hidden"
              style={{ backgroundColor: school.primaryColor }}
            >
              {school.shortName.charAt(0)}
            </div>
            <CardTitle>Bienvenido</CardTitle>
            <CardDescription>Ingresa con tus credenciales del colegio</CardDescription>
          </CardHeader>
          <CardContent>
            <LoginForm />
          </CardContent>
        </Card>
      </section>
    </main>
  );
}