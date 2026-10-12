import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isStaff } from "@/lib/roles";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type SearchResult = {
  id: string;
  type: "student" | "user" | "course" | "academy" | "payment";
  title: string;
  subtitle?: string;
  href: string;
};

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user || !isStaff(session.user.role)) {
    return NextResponse.json({ results: [] }, { status: 401 });
  }

  const q = (new URL(request.url).searchParams.get("q") ?? "").trim();
  if (q.length < 2) return NextResponse.json({ results: [] });

  const insensitive = { contains: q, mode: "insensitive" as const };

  const [students, users, courses, academyCourses, payments] = await Promise.all([
    prisma.student.findMany({
      where: { OR: [{ firstName: insensitive }, { lastName: insensitive }, { document: insensitive }] },
      take: 5,
      orderBy: [{ lastName: "asc" }],
      select: { id: true, firstName: true, lastName: true, document: true },
    }),
    prisma.user.findMany({
      where: { OR: [{ name: insensitive }, { email: insensitive }] },
      take: 4,
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true, email: true },
    }),
    prisma.course.findMany({
      where: { name: insensitive },
      take: 3,
      orderBy: { name: "asc" },
      select: { id: true, name: true, grade: { select: { name: true, level: { select: { name: true } } } } },
    }),
    prisma.academyCourse.findMany({
      where: { name: insensitive },
      take: 3,
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.payment.findMany({
      where: { OR: [{ receiptNumber: insensitive }, { reference: insensitive }] },
      take: 3,
      orderBy: { date: "desc" },
      select: {
        id: true,
        receiptNumber: true,
        amount: true,
        student: { select: { firstName: true, lastName: true } },
      },
    }),
  ]);

  const results: SearchResult[] = [
    ...students.map((s) => ({
      id: s.id,
      type: "student" as const,
      title: `${s.lastName}, ${s.firstName}`,
      subtitle: s.document ?? "Alumno",
      href: `/admin/alumnos/${s.id}`,
    })),
    ...users.map((u) => ({
      id: u.id,
      type: "user" as const,
      title: u.name ?? u.email,
      subtitle: u.email,
      href: "/admin/usuarios",
    })),
    ...courses.map((c) => ({
      id: c.id,
      type: "course" as const,
      title: c.name,
      subtitle: `${c.grade.level.name} · ${c.grade.name}`,
      href: "/admin/cursos",
    })),
    ...academyCourses.map((c) => ({
      id: c.id,
      type: "academy" as const,
      title: c.name,
      subtitle: "Curso de academia",
      href: `/admin/academia/cursos/${c.id}`,
    })),
    ...payments.map((p) => ({
      id: p.id,
      type: "payment" as const,
      title: p.receiptNumber,
      subtitle: `${p.student.lastName}, ${p.student.firstName} · S/ ${Number(p.amount).toFixed(2)}`,
      href: "/admin/pagos",
    })),
  ];

  return NextResponse.json({ results });
}