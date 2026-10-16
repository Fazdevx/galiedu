import Link from "next/link";
import { CheckCircle2, ChevronRight, Circle, Rocket } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";

export async function OnboardingChecklist() {
  const [activeYear, levels, grades, sections, students, users, enrollments] = await Promise.all([
    prisma.academicYear.findFirst({ where: { isActive: true }, select: { id: true } }),
    prisma.level.count(),
    prisma.grade.count(),
    prisma.section.count(),
    prisma.student.count(),
    prisma.user.count(),
    prisma.enrollment.count(),
  ]);

  const steps = [
    { label: "Activa un año académico", href: "/admin/academic-years", done: Boolean(activeYear) },
    { label: "Crea los niveles", href: "/admin/niveles", done: levels > 0 },
    { label: "Crea los grados", href: "/admin/grados", done: grades > 0 },
    { label: "Crea las secciones", href: "/admin/secciones", done: sections > 0 },
    { label: "Registra alumnos", href: "/admin/alumnos", done: students > 0 },
    { label: "Crea usuarios del personal", href: "/admin/usuarios", done: users > 0 },
    { label: "Matricula a los alumnos", href: "/admin/matriculas", done: enrollments > 0 },
  ];

  const done = steps.filter((s) => s.done).length;
  if (done === steps.length) return null;
  const progress = Math.round((done / steps.length) * 100);

  return (
    <Card className="border-primary-soft-strong bg-gradient-to-br from-white to-primary-soft/40 shadow-card">
      <CardHeader className="flex-row items-start justify-between gap-3">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Rocket className="h-4 w-4 text-primary" /> Primeros pasos
          </CardTitle>
          <CardDescription>Completa la configuración inicial para aprovechar el sistema.</CardDescription>
        </div>
        <span className="shrink-0 text-sm font-semibold text-primary">
          {done}/{steps.length}
        </span>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="h-2 w-full overflow-hidden rounded-full bg-white/70 ring-1 ring-inset ring-primary-soft-strong/50">
          <div
            className="h-full rounded-full bg-gradient-to-r from-primary to-primary-strong transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <ul className="grid gap-1 sm:grid-cols-2">
          {steps.map((s) => (
            <li key={s.label}>
              <Link
                href={s.href}
                className="group flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-white"
              >
                {s.done ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                ) : (
                  <Circle className="h-4 w-4 shrink-0 text-gray-300" />
                )}
                <span className={s.done ? "text-gray-400 line-through" : "text-gray-700"}>{s.label}</span>
                {!s.done ? (
                  <ChevronRight className="ml-auto h-3.5 w-3.5 text-gray-300 group-hover:text-gray-500" />
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}