import type { Role } from "@/generated/prisma/client";

export const ROLE_LABELS: Record<Role, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Administrador",
  DIRECTOR: "Director/a",
  COORDINADOR: "Coordinador/a",
  PROFESOR: "Profesor/a",
  ALUMNO: "Alumno/a",
  APODERADO: "Apoderado/a",
};

// Roles con acceso a gestión interna (panel admin)
export const STAFF_ROLES: ReadonlySet<string> = new Set<Role>([
  "SUPER_ADMIN",
  "ADMIN",
  "DIRECTOR",
  "COORDINADOR",
  "PROFESOR",
]);

// Roles con acceso a la administración del sistema (usuarios y estructura)
export const ADMIN_ROLES: ReadonlySet<string> = new Set<Role>([
  "SUPER_ADMIN",
  "ADMIN",
]);

// Roles con acceso al portal de familias (solo lectura)
export const PORTAL_ROLES: ReadonlySet<string> = new Set<Role>([
  "APODERADO",
  "ALUMNO",
]);

export function isStaff(role?: string | null): boolean {
  return role ? STAFF_ROLES.has(role) : false;
}

export function isAdmin(role?: string | null): boolean {
  return role ? ADMIN_ROLES.has(role) : false;
}

export function isPortalUser(role?: string | null): boolean {
  return role ? PORTAL_ROLES.has(role) : false;
}