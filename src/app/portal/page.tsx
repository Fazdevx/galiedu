import Link from "next/link";
import { ArrowRight, GraduationCap } from "lucide-react";
import { auth } from "@/auth";
import { getPortalStudents } from "@/lib/portal";
import { Badge, Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata = { title: "Portal de familias" };

function initials(first: string, last: string) {
  return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
}

export default async function PortalHomePage() {
  const session = await auth();
  const user = session!.user;
  const students = await getPortalStudents(user.id);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">
          {user.role === "ALUMNO" ? "Mi información" : "Mis hijos"}
        </h1>
        <p className="text-sm text-gray-500">
          Consulta notas, asistencia, pagos y descarga los documentos en PDF.
        </p>
      </div>

      {students.length === 0 ? (
        <Card>
          <EmptyState
            icon={GraduationCap}
            title="Sin alumnos vinculados"
            description="Aún no hay alumnos vinculados a tu cuenta. Comunícate con la secretaría del colegio."
          />
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {students.map((s) => {
            const enrollment = s.enrollments[0];
            const section = enrollment?.section;
            return (
              <Card key={s.id} className="transition-all hover:-translate-y-0.5 hover:shadow-md">
                <CardContent className="flex flex-col gap-4 p-5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary-soft text-sm font-semibold text-primary">
                      {initials(s.firstName, s.lastName)}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-gray-900">
                        {s.firstName} {s.lastName}
                      </p>
                      <p className="text-xs text-gray-500">
                        {s.document ? `DNI ${s.document}` : "Sin documento"}
                      </p>
                    </div>
                  </div>
                  <div>
                    {section ? (
                      <Badge tone="primary">
                        {section.grade.level.name} · {section.grade.name} · {section.name}
                      </Badge>
                    ) : (
                      <Badge tone="gray">Sin matrícula vigente</Badge>
                    )}
                  </div>
                  <Link href={`/portal/alumnos/${s.id}`}>
                    <Button variant="outline" className="w-full justify-between">
                      Ver ficha <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}