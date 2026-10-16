import { prisma } from "@/lib/prisma";
import { BoletínForm } from "@/components/admin/boletines-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "Boletines de notas" };

export default async function BoletinesPage() {
  const [students, years] = await Promise.all([
    prisma.student.findMany({ orderBy: [{ lastName: "asc" }] }),
    prisma.academicYear.findMany({ orderBy: { year: "desc" } }),
  ]);

  const defaultYearId = years.find((y) => y.isActive)?.id;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Boletines de notas</h1>
        <p className="text-sm text-gray-500">
          Genera el boletín de notas por alumno: calificaciones por período, promedio y asistencia.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Parámetros</CardTitle>
            <CardDescription>Selecciona alumno y año académico.</CardDescription>
          </CardHeader>
          <BoletínForm
            students={students.map((s) => ({
              id: s.id,
              label: `${s.lastName}, ${s.firstName}${s.document ? ` — ${s.document}` : ""}`,
            }))}
            years={years.map((y) => ({ id: y.id, label: y.isActive ? `${y.name} (activo)` : y.name }))}
            defaultYearId={defaultYearId}
          />
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Qué incluye el boletín</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc space-y-1 pl-5 text-sm text-gray-600">
              <li>Datos del alumno, apoderado y sección (nivel · grado · sección).</li>
              <li>Tabla de calificaciones por período (I–IV bimestre) y promedio por área.</li>
              <li>Resumen de asistencia: presentes, tardanzas, faltas y justificadas.</li>
              <li>Líneas de firma: Director(a), Tutor(a) y Apoderado(a).</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}