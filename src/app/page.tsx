import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  BookOpen,
  CalendarCheck2,
  GraduationCap,
  LogIn,
  ReceiptText,
  Sparkles,
  Users,
} from "lucide-react";
import { auth } from "@/auth";
import { isStaff, isPortalUser } from "@/lib/roles";
import { getSchoolSettings } from "@/lib/settings";
import { Button } from "@/components/ui/button";

const FEATURES = [
  { icon: Users, title: "Alumnos y familias", text: "Fichas, apoderados y matrículas por nivel, grado y sección." },
  { icon: BookOpen, title: "Académico", text: "Cursos, notas por bimestre y boletines de notas en PDF." },
  { icon: CalendarCheck2, title: "Asistencia", text: "Registro diario con resumen de presentes, tardanzas y faltas." },
  { icon: ReceiptText, title: "Pagos y boletas", text: "Conceptos, registro de pagos y boleta en PDF al instante." },
];

const LEVELS = ["Inicial", "Primaria", "Secundaria", "Academia"];

export default async function Home() {
  const session = await auth();
  const staff = session?.user ? isStaff(session.user.role) : false;

  if (session?.user && isPortalUser(session.user.role)) {
    redirect("/portal");
  }

  const school = await getSchoolSettings();

  return (
    <div className="flex min-h-screen flex-1 flex-col">
      <header className="sticky top-0 z-30 border-b border-gray-100 bg-white/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-3.5">
          <div className="flex items-center gap-2.5">
            {school.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={school.logoUrl} alt={school.shortName} className="h-9 w-9 rounded-lg object-contain" />
            ) : (
              <div
                className="flex h-9 w-9 items-center justify-center rounded-lg text-base font-bold text-white"
                style={{ backgroundColor: school.primaryColor }}
              >
                {school.shortName.charAt(0)}
              </div>
            )}
            <span className="font-semibold text-gray-900">{school.shortName}</span>
          </div>
          <div className="flex items-center gap-2">
            {session?.user ? (
              <Link href={staff ? "/admin" : "/portal"}>
                <Button variant="outline">{staff ? "Panel de gestión" : "Mi cuenta"}</Button>
              </Link>
            ) : (
              <Link href="/login">
                <Button>
                  <LogIn className="h-4 w-4" /> Iniciar sesión
                </Button>
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1">
        <section className="relative overflow-hidden">
          <div
            className="absolute inset-x-0 top-0 h-[480px]"
            style={{ background: "linear-gradient(180deg, var(--primary-soft) 0%, var(--background) 100%)" }}
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 h-[480px] opacity-40"
            style={{
              backgroundImage: "radial-gradient(circle at 1px 1px, rgb(0 0 0 / 0.05) 1px, transparent 0)",
              backgroundSize: "24px 24px",
              maskImage: "radial-gradient(ellipse 70% 60% at 50% 0%, black, transparent)",
            }}
          />
          <div className="relative mx-auto flex w-full max-w-6xl flex-col items-center gap-6 px-6 py-16 text-center md:py-24">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary-soft-strong bg-white/80 px-3 py-1 text-xs font-medium text-primary shadow-soft backdrop-blur">
              <Sparkles className="h-3.5 w-3.5" /> {school.slogan ?? "Inicial · Primaria · Secundaria · Academia"}
            </span>
            <h1 className="max-w-3xl text-4xl font-bold tracking-tight text-gray-900 md:text-5xl">
              La plataforma integral de <span className="text-primary">{school.shortName}</span>
            </h1>
            <p className="max-w-2xl text-lg leading-relaxed text-gray-600">
              Gestiona alumnos, notas, asistencia, pagos y documentos oficiales, y da a las familias su
              propio portal con boletines y boletas en PDF.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link href="/login">
                <Button size="lg" className="w-full shadow-raised sm:w-auto">
                  Acceder al sistema <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/login">
                <Button size="lg" variant="outline" className="w-full bg-white/80 backdrop-blur sm:w-auto">
                  Portal de familias
                </Button>
              </Link>
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              {LEVELS.map((l) => (
                <span
                  key={l}
                  className="rounded-full border border-gray-200/80 bg-white px-3 py-1 text-sm font-medium text-gray-600 shadow-soft"
                >
                  {l}
                </span>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-6xl px-6 pb-20">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((f) => {
              const Icon = f.icon;
              return (
                <div
                  key={f.title}
                  className="group rounded-xl border border-gray-200/80 bg-white p-5 shadow-card transition-all hover:-translate-y-0.5 hover:border-primary-soft-strong hover:shadow-raised"
                >
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary-soft text-primary ring-1 ring-inset ring-primary-soft-strong/60 transition-transform group-hover:scale-105">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mb-1 font-semibold text-gray-900">{f.title}</h3>
                  <p className="text-sm leading-relaxed text-gray-500">{f.text}</p>
                </div>
              );
            })}
          </div>
        </section>
      </main>

      <footer className="border-t border-gray-200/70 bg-white">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-3 px-6 py-6 text-sm text-gray-500 sm:flex-row">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-4 w-4 text-primary" />
            <span className="font-medium text-gray-700">{school.name}</span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
            {school.address ? <span>{school.address}</span> : null}
            {school.phone ? <span>{school.phone}</span> : null}
            {school.website ? <span>{school.website}</span> : null}
          </div>
        </div>
      </footer>
    </div>
  );
}