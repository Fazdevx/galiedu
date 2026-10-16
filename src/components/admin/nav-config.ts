import type { Role } from "@/generated/prisma/client";

/**
 * Visibilidad de cada sección del panel por rol:
 * - "all": cualquier rol del personal (SUPER_ADMIN, ADMIN, DIRECTOR, COORDINADOR, PROFESOR)
 * - "admin": solo SUPER_ADMIN y ADMIN
 * - "super": solo SUPER_ADMIN
 * - "solicitudes": DIRECTOR (crear) y SUPER_ADMIN/ADMIN (revisar)
 */
export type NavAccess = "all" | "admin" | "super" | "solicitudes";

export const NAV_ACCESS: Record<string, NavAccess> = {
  "/admin": "all",
  "/admin/usuarios": "admin",
  "/admin/alumnos": "all",
  "/admin/matriculas": "admin",
  "/admin/cursos": "all",
  "/admin/notas": "all",
  "/admin/asistencia": "all",
  "/admin/boletines": "all",
  "/admin/academic-years": "admin",
  "/admin/niveles": "admin",
  "/admin/grados": "admin",
  "/admin/secciones": "admin",
  "/admin/academia/cursos": "admin",
  "/admin/academia/inscripciones": "admin",
  "/admin/pagos": "admin",
  "/admin/pagos/conceptos": "admin",
  "/admin/configuracion": "admin",
  "/admin/auditoria": "admin",
  "/admin/solicitudes": "solicitudes",
};

export function navAccessAllowed(access: NavAccess, role: Role): boolean {
  switch (access) {
    case "all":
      return true;
    case "admin":
      return role === "SUPER_ADMIN" || role === "ADMIN";
    case "super":
      return role === "SUPER_ADMIN";
    case "solicitudes":
      return role === "DIRECTOR" || role === "SUPER_ADMIN" || role === "ADMIN";
  }
}
