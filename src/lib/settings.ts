import { prisma } from "@/lib/prisma";

export type SchoolInfo = {
  name: string;
  shortName: string;
  slogan: string | null;
  ruc: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  /** URL pública del logo (`/api/logo?v=...`) o data URL para los PDF. */
  logoUrl: string | null;
  directorName: string | null;
  directorDocument: string | null;
  primaryColor: string;
};

export const DEFAULT_SCHOOL: SchoolInfo = {
  name: "Institución Educativa Particular Galileo",
  shortName: "Galileo EDU",
  slogan: "Inicial · Primaria · Secundaria · Academia",
  ruc: null,
  address: null,
  phone: null,
  email: null,
  website: null,
  logoUrl: null,
  directorName: null,
  directorDocument: null,
  primaryColor: "#0f766e",
};

type SettingsRow = {
  name: string;
  shortName: string;
  slogan: string | null;
  ruc: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  directorName: string | null;
  directorDocument: string | null;
  primaryColor: string;
};

function mapSchool(s: SettingsRow, logoUrl: string | null): SchoolInfo {
  return {
    name: s.name,
    shortName: s.shortName,
    slogan: s.slogan,
    ruc: s.ruc,
    address: s.address,
    phone: s.phone,
    email: s.email,
    website: s.website,
    logoUrl,
    directorName: s.directorName,
    directorDocument: s.directorDocument,
    primaryColor: s.primaryColor,
  };
}

const SETTINGS_FIELDS = {
  name: true,
  shortName: true,
  slogan: true,
  ruc: true,
  address: true,
  phone: true,
  email: true,
  website: true,
  directorName: true,
  directorDocument: true,
  primaryColor: true,
} as const;

/**
 * Configuración para la web. El logo se sirve por `/api/logo` (cacheado por el
 * navegador) en lugar de incrustar los bytes en cada respuesta.
 */
export async function getSchoolSettings(): Promise<SchoolInfo> {
  const s = await prisma.schoolSettings
    .findUnique({
      where: { id: "default" },
      select: { ...SETTINGS_FIELDS, logoMime: true, updatedAt: true },
    })
    .catch(() => null);
  if (!s) return DEFAULT_SCHOOL;

  const logoUrl = s.logoMime ? `/api/logo?v=${s.updatedAt.getTime()}` : null;
  return mapSchool(s, logoUrl);
}

/**
 * Configuración para la generación de PDF: incrusta el logo como data URL
 * porque react-pdf no resuelve rutas relativas en el render del servidor.
 */
export async function getPdfSchoolInfo(): Promise<SchoolInfo> {
  const s = await prisma.schoolSettings
    .findUnique({
      where: { id: "default" },
      select: { ...SETTINGS_FIELDS, logoData: true, logoMime: true },
    })
    .catch(() => null);
  if (!s) return DEFAULT_SCHOOL;

  const logoUrl =
    s.logoData && s.logoMime
      ? `data:${s.logoMime};base64,${Buffer.from(s.logoData).toString("base64")}`
      : null;
  return mapSchool(s, logoUrl);
}
