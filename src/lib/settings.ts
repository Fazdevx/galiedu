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

export async function getSchoolSettings(): Promise<SchoolInfo> {
  const s = await prisma.schoolSettings.findUnique({ where: { id: "default" } }).catch(() => null);
  if (!s) return DEFAULT_SCHOOL;

  return {
    name: s.name,
    shortName: s.shortName,
    slogan: s.slogan,
    ruc: s.ruc,
    address: s.address,
    phone: s.phone,
    email: s.email,
    website: s.website,
    logoUrl: s.logoUrl,
    directorName: s.directorName,
    directorDocument: s.directorDocument,
    primaryColor: s.primaryColor,
  };
}
