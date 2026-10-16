"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  BookOpenCheck,
  CalendarCheck2,
  CalendarRange,
  ClipboardList,
  FileText,
  GraduationCap,
  History,
  LayoutDashboard,
  LayoutGrid,
  Layers,
  NotebookPen,
  ReceiptText,
  School,
  Send,
  Settings,
  UserPlus,
  Users,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { NAV_ACCESS, navAccessAllowed } from "@/components/admin/nav-config";
import { usePermissions } from "@/components/admin/permissions";

const groups: { label: string; items: { href: string; label: string; icon: React.ComponentType<{ className?: string }> }[] }[] = [
  {
    label: "Gestión",
    items: [{ href: "/admin", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    label: "Usuarios y estudiantes",
    items: [
      { href: "/admin/usuarios", label: "Usuarios", icon: Users },
      { href: "/admin/solicitudes", label: "Solicitudes", icon: Send },
      { href: "/admin/alumnos", label: "Alumnos", icon: GraduationCap },
      { href: "/admin/matriculas", label: "Matrículas", icon: ClipboardList },
    ],
  },
  {
    label: "Académico",
    items: [
      { href: "/admin/cursos", label: "Cursos", icon: BookOpen },
      { href: "/admin/notas", label: "Notas", icon: NotebookPen },
      { href: "/admin/asistencia", label: "Asistencia", icon: CalendarCheck2 },
      { href: "/admin/boletines", label: "Boletines de notas", icon: FileText },
    ],
  },
  {
    label: "Estructura",
    items: [
      { href: "/admin/academic-years", label: "Años académicos", icon: CalendarRange },
      { href: "/admin/niveles", label: "Niveles", icon: Layers },
      { href: "/admin/grados", label: "Grados", icon: School },
      { href: "/admin/secciones", label: "Secciones", icon: LayoutGrid },
    ],
  },
  {
    label: "Academia",
    items: [
      { href: "/admin/academia/cursos", label: "Cursos de academia", icon: BookOpenCheck },
      { href: "/admin/academia/inscripciones", label: "Inscripciones", icon: UserPlus },
    ],
  },
  {
    label: "Finanzas",
    items: [
      { href: "/admin/pagos", label: "Pagos y boletas", icon: Wallet },
      { href: "/admin/pagos/conceptos", label: "Conceptos de pago", icon: ReceiptText },
    ],
  },
  {
    label: "Sistema",
    items: [
      { href: "/admin/configuracion", label: "Configuración", icon: Settings },
      { href: "/admin/auditoria", label: "Auditoría", icon: History },
    ],
  },
];

export function AdminNav() {
  const pathname = usePathname();
  const { role } = usePermissions();

  const visibleGroups = groups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => {
        const access = NAV_ACCESS[item.href] ?? "all";
        return role ? navAccessAllowed(access, role) : false;
      }),
    }))
    .filter((group) => group.items.length > 0);

  return (
    <nav className="flex flex-col gap-6">
      {visibleGroups.map((group) => (
        <div key={group.label} className="flex flex-col gap-0.5">
          <p className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-widest text-gray-500">
            {group.label}
          </p>
          {group.items.map((item) => {
            const active = item.href === "/admin"
              ? pathname === "/admin"
              : pathname === item.href || pathname.startsWith(item.href + "/");
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary text-white shadow-sm shadow-primary/25"
                    : "text-gray-400 hover:bg-white/5 hover:text-white",
                )}
              >
                <Icon
                  className={cn(
                    "h-4 w-4 shrink-0 transition-opacity",
                    active ? "opacity-100" : "opacity-70 group-hover:opacity-100",
                  )}
                />
                {item.label}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}