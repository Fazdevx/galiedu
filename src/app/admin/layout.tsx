import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AdminNav } from "@/components/admin/nav";
import { AppChrome, type BreadcrumbEntry } from "@/components/admin/chrome";
import { CommandPalette } from "@/components/admin/command-palette";
import { SearchTrigger } from "@/components/admin/search-trigger";
import { PermissionsProvider } from "@/components/admin/permissions";
import { signOutAction } from "@/components/admin/actions";
import { Badge } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { isAdmin, isStaff, ROLE_LABELS } from "@/lib/roles";
import { getSchoolSettings } from "@/lib/settings";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const links: Record<string, BreadcrumbEntry> = {
  "/admin": { area: "Inicio", page: "Dashboard" },
  "/admin/usuarios": { area: "Usuarios y estudiantes", page: "Usuarios" },
  "/admin/alumnos": { area: "Usuarios y estudiantes", page: "Alumnos" },
  "/admin/matriculas": { area: "Usuarios y estudiantes", page: "Matrículas" },
  "/admin/cursos": { area: "Académico", page: "Cursos" },
  "/admin/notas": { area: "Académico", page: "Notas" },
  "/admin/asistencia": { area: "Académico", page: "Asistencia" },
  "/admin/boletines": { area: "Académico", page: "Boletines de notas" },
  "/admin/academic-years": { area: "Estructura", page: "Años académicos" },
  "/admin/niveles": { area: "Estructura", page: "Niveles" },
  "/admin/grados": { area: "Estructura", page: "Grados" },
  "/admin/secciones": { area: "Estructura", page: "Secciones" },
  "/admin/academia/cursos": { area: "Academia", page: "Cursos de academia" },
  "/admin/academia/inscripciones": { area: "Academia", page: "Inscripciones" },
  "/admin/pagos/conceptos": { area: "Finanzas", page: "Conceptos de pago" },
  "/admin/pagos": { area: "Finanzas", page: "Pagos y boletas" },
  "/admin/configuracion": { area: "Sistema", page: "Configuración" },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  if (!session?.user) redirect("/login");
  if (!isStaff(session.user.role)) redirect("/");

  const { user } = session;
  const roleLabel = ROLE_LABELS[user.role] ?? user.role;
  const [school, activeYear] = await Promise.all([
    getSchoolSettings(),
    prisma.academicYear.findFirst({ where: { isActive: true }, select: { name: true, year: true } }),
  ]);

  const brand = (
    <div className="flex items-center gap-2.5 px-5 py-4">
      {school.logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={school.logoUrl} alt={school.shortName} className="h-9 w-9 rounded-lg bg-white object-contain p-0.5" />
      ) : (
        <div
          className="flex h-9 w-9 items-center justify-center rounded-lg text-base font-bold text-white"
          style={{ backgroundColor: school.primaryColor }}
        >
          {school.shortName.charAt(0)}
        </div>
      )}
      <div className="leading-tight">
        <p className="text-sm font-semibold">{school.shortName}</p>
        <p className="text-xs text-gray-400">Panel de gestión</p>
      </div>
    </div>
  );

  const signOut = (
    <form action={signOutAction}>
      <Button type="submit" variant="ghost" size="sm" className="text-gray-300 hover:bg-gray-800 hover:text-white">
        Salir
      </Button>
    </form>
  );

  return (
    <PermissionsProvider isAdmin={isAdmin(user.role)}>
      <AppChrome
        baseLabel="Panel"
        links={links}
        brand={brand}
        userName={user.name ?? "Usuario"}
        userRole={roleLabel}
        nav={<AdminNav />}
        signOut={signOut}
        actions={
          <>
            <SearchTrigger />
            {activeYear ? (
              <span className="mr-1 hidden items-center rounded-full bg-primary-soft px-3 py-1 text-xs font-medium text-primary sm:inline-flex">
                {activeYear.name}
              </span>
            ) : null}
            <Badge tone="primary">{roleLabel}</Badge>
          </>
        }
      >
        {children}
      </AppChrome>
      <CommandPalette />
    </PermissionsProvider>
  );
}