import { redirect } from "next/navigation";
import { LogOut } from "lucide-react";
import { auth } from "@/auth";
import { signOutAction } from "@/components/admin/actions";
import { PortalNav } from "@/components/portal/nav";
import { AppChrome, type BreadcrumbEntry } from "@/components/admin/chrome";
import { Button } from "@/components/ui/button";
import { isStaff, isPortalUser, ROLE_LABELS } from "@/lib/roles";
import { getPortalStudents } from "@/lib/portal";
import { getSchoolSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

const links: Record<string, BreadcrumbEntry> = {
  "/portal": { area: "Portal", page: "Mis hijos" },
  "/portal/alumnos": { area: "Portal", page: "Ficha del alumno" },
};

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (isStaff(session.user.role)) redirect("/admin");
  if (!isPortalUser(session.user.role)) redirect("/");

  const { user } = session;
  const [students, school] = await Promise.all([getPortalStudents(user.id), getSchoolSettings()]);
  const roleLabel = ROLE_LABELS[user.role] ?? user.role;

  const items = [
    { href: "/portal", label: "Inicio" },
    ...students.map((s) => ({
      href: `/portal/alumnos/${s.id}`,
      label: `${s.firstName} ${s.lastName}`,
    })),
  ];

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
        <p className="text-xs text-gray-400">Portal de familias</p>
      </div>
    </div>
  );

  const signOut = (
    <form action={signOutAction}>
      <Button
        type="submit"
        variant="ghost"
        size="sm"
        className="shrink-0 text-gray-400 hover:bg-white/10 hover:text-white"
        aria-label="Cerrar sesión"
      >
        <LogOut className="h-4 w-4" /> Salir
      </Button>
    </form>
  );

  return (
    <AppChrome
      baseLabel="Portal"
      links={links}
      brand={brand}
      userName={user.name ?? "Usuario"}
      userRole={roleLabel}
      nav={<PortalNav items={items} />}
      signOut={signOut}
    >
      {children}
    </AppChrome>
  );
}