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
  LayoutDashboard,
  LayoutGrid,
  Layers,
  NotebookPen,
  ReceiptText,
  School,
  Settings,
  UserPlus,
  Users,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";

const groups: { label: string; items: { href: string; label: string; icon: React.ComponentType<{ className?: string }> }[] }[] = [
  {
    label: "Gestión",
    items: [{ href: "/admin", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    label: "Usuarios y estudiantes",
    items: [
      { href: "/admin/usuarios", label: "Usuarios", icon: Users },
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
    items: [{ href: "/admin/configuracion", label: "Configuración", icon: Settings }],
  },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-5">
      {groups.map((group) => (
        <div key={group.label} className="flex flex-col gap-1">
          <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500">{group.label}</p>
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
                  "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary text-white shadow-sm"
                    : "text-gray-300 hover:bg-gray-800 hover:text-white",
                )}
              >
                <Icon className="h-4 w-4 shrink-0 opacity-80" />
                {item.label}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}