import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Clock,
  GraduationCap,
  LayoutGrid,
  Plus,
  ReceiptText,
  TrendingDown,
  TrendingUp,
  UserRoundPlus,
  Users,
  Wallet,
  XCircle,
} from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { formatDate, monthRangeUTC } from "@/lib/date";
import { Badge, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { AttendanceStatus } from "@/generated/prisma/client";
import { OnboardingChecklist } from "@/app/admin/onboarding";

export const metadata = { title: "Dashboard" };

const MONTHS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

function money(n: number) {
  return `S/ ${n.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function moneyShort(n: number) {
  if (n >= 1_000_000) return `S/ ${(n / 1_000_000).toLocaleString("es-PE", { maximumFractionDigits: 1 })} M`;
  if (n >= 1_000) return `S/ ${(n / 1_000).toLocaleString("es-PE", { maximumFractionDigits: 1 })} k`;
  return money(n);
}

function pct(n: number) {
  return `${n >= 0 ? "+" : ""}${n.toLocaleString("es-PE", { maximumFractionDigits: 0 })}%`;
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "—";
  return `${parts[0].charAt(0)}${parts[1]?.charAt(0) ?? ""}`.toUpperCase();
}

function greetingFor(hour: number) {
  if (hour < 12) return "Buenos días";
  if (hour < 19) return "Buenas tardes";
  return "Buenas noches";
}

function AttendanceRing({ present, total }: { present: number; total: number }) {
  const ratio = total > 0 ? present / total : 0;
  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  return (
    <div className="relative h-[88px] w-[88px] shrink-0">
      <svg viewBox="0 0 80 80" className="h-full w-full -rotate-90" aria-hidden="true">
        <circle cx="40" cy="40" r={radius} fill="none" stroke="currentColor" strokeWidth="7" className="text-gray-100" />
        <circle
          cx="40"
          cy="40"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - ratio)}
          className="text-primary transition-all duration-700"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-bold tabular-nums leading-none text-gray-900">
          {Math.round(ratio * 100)}%
        </span>
        <span className="mt-0.5 text-[10px] font-medium text-gray-400">asistencia</span>
      </div>
    </div>
  );
}

export default async function AdminDashboardPage() {
  const session = await auth();
  const activeYear = await prisma.academicYear.findFirst({ where: { isActive: true } });

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const todayStart = new Date(Date.UTC(currentYear, currentMonth, now.getDate()));
  const tomorrowStart = new Date(Date.UTC(currentYear, currentMonth, now.getDate() + 1));
  const { start: monthStart, end: nextMonthStart } = monthRangeUTC(currentYear, currentMonth);
  const { start: prevMonthStart } = monthRangeUTC(currentYear, currentMonth - 1);

  const [
    users,
    students,
    sections,
    enrollments,
    courses,
    paymentCount,
    payments,
    recent,
    noEnrollment,
    noGuardian,
    byLevel,
    paymentsThisMonth,
    prevMonthTotal,
    attendanceToday,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.student.count(),
    prisma.section.count(),
    prisma.enrollment.count(),
    prisma.course.count(),
    prisma.payment.count(),
    activeYear
      ? prisma.payment.findMany({
          where: { academicYearId: activeYear.id },
          select: { date: true, amount: true },
        })
      : Promise.resolve([]),
    prisma.payment.findMany({
      take: 5,
      orderBy: { date: "desc" },
      include: { student: true, concept: true },
    }),
    activeYear
      ? prisma.student.count({ where: { enrollments: { none: { academicYearId: activeYear.id } } } })
      : Promise.resolve(0),
    prisma.student.count({ where: { guardianUserId: null } }),
    prisma.enrollment.findMany({
      where: activeYear ? { academicYearId: activeYear.id } : { id: "__none__" },
      select: { section: { select: { grade: { select: { level: { select: { name: true, order: true } } } } } } },
    }),
    prisma.payment.aggregate({
      where: { date: { gte: monthStart, lt: nextMonthStart } },
      _count: true,
      _sum: { amount: true },
    }),
    prisma.payment.aggregate({
      where: { date: { gte: prevMonthStart, lt: monthStart } },
      _sum: { amount: true },
    }),
    prisma.attendance.groupBy({
      by: ["status"],
      where: { date: { gte: todayStart, lt: tomorrowStart } },
      _count: true,
    }),
  ]);

  const totalMonto = payments.reduce((acc, p) => acc + Number(p.amount), 0);
  const byMonth = Array(12).fill(0);
  for (const p of payments) byMonth[p.date.getUTCMonth()] += Number(p.amount);
  const maxMonth = Math.max(...byMonth, 1);

  const attToday: Partial<Record<AttendanceStatus, number>> = {};
  for (const r of attendanceToday) attToday[r.status] = r._count;
  const attTotal = attendanceToday.reduce((acc, r) => acc + r._count, 0);
  const attPresent = (attToday.PRESENT ?? 0) + (attToday.LATE ?? 0);

  const thisTotal = Number(paymentsThisMonth._sum.amount ?? 0);
  const prevTotal = Number(prevMonthTotal._sum.amount ?? 0);
  const delta = prevTotal > 0 ? ((thisTotal - prevTotal) / prevTotal) * 100 : null;
  const rising = (delta ?? 0) >= 0;

  const levelTotals = new Map<string, { order: number; count: number }>();
  for (const e of byLevel) {
    const lvl = e.section.grade.level;
    const prev = levelTotals.get(lvl.name);
    levelTotals.set(lvl.name, { order: lvl.order, count: (prev?.count ?? 0) + 1 });
  }
  const levelRows = [...levelTotals.entries()]
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => a.order - b.order);
  const maxLevel = Math.max(...levelRows.map((r) => r.count), 1);
  const totalEnrolledLevels = levelRows.reduce((acc, r) => acc + r.count, 0);

  const userName = session?.user?.name?.split(" ")[0] ?? "usuario";
  const longDate = new Intl.DateTimeFormat("es-PE", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(now);

  const stats = [
    { label: "Usuarios", value: users, href: "/admin/usuarios", icon: Users },
    { label: "Alumnos", value: students, href: "/admin/alumnos", icon: GraduationCap },
    { label: "Matrículas", value: enrollments, href: "/admin/matriculas", icon: ClipboardList },
    { label: "Cursos", value: courses, href: "/admin/cursos", icon: BookOpen },
    { label: "Secciones", value: sections, href: "/admin/secciones", icon: LayoutGrid },
    { label: "Pagos", value: paymentCount, href: "/admin/pagos", icon: Wallet },
  ];

  const attendanceRows = [
    { label: "Asistieron", value: attToday.PRESENT ?? 0, icon: CheckCircle2, tone: "text-emerald-600 bg-emerald-100" },
    { label: "Tardanzas", value: attToday.LATE ?? 0, icon: Clock, tone: "text-amber-600 bg-amber-100" },
    { label: "Faltas", value: attToday.ABSENT ?? 0, icon: XCircle, tone: "text-red-600 bg-red-100" },
    { label: "Justificadas", value: attToday.JUSTIFIED ?? 0, icon: CalendarDays, tone: "text-blue-600 bg-blue-100" },
  ] as const;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold capitalize text-primary">{longDate}</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-gray-900">
            {greetingFor(now.getHours())}, {userName}
          </h1>
          <p className="mt-1.5 text-sm text-gray-500">
            {activeYear ? (
              <>
                Año académico <span className="font-semibold text-gray-700">{activeYear.name}</span> en curso ·{" "}
                {MONTHS[now.getMonth()].toLowerCase()} {now.getFullYear()}
              </>
            ) : (
              "Resumen general del sistema."
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/alumnos">
            <Button variant="outline" className="bg-white">
              <Plus className="h-4 w-4" /> Nuevo alumno
            </Button>
          </Link>
          <Link href="/admin/pagos">
            <Button>
              <ReceiptText className="h-4 w-4" /> Registrar pago
            </Button>
          </Link>
        </div>
      </div>

      <OnboardingChecklist />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <Link key={s.label} href={s.href}>
              <Card className="group h-full transition-all hover:-translate-y-0.5 hover:border-primary-soft-strong hover:shadow-raised">
                <CardContent className="flex h-full items-start justify-between gap-2 p-4">
                  <div className="min-w-0">
                    <p className="text-2xl font-bold tabular-nums leading-none tracking-tight text-gray-900">
                      {s.value}
                    </p>
                    <p className="mt-1.5 truncate text-xs font-medium text-gray-500">{s.label}</p>
                  </div>
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary ring-1 ring-inset ring-primary-soft-strong/60 transition-transform group-hover:scale-105">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex-row items-start justify-between">
            <div>
              <CardTitle>Recaudación del mes</CardTitle>
              <CardDescription>{MONTHS[now.getMonth()]} {now.getFullYear()}</CardDescription>
            </div>
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-soft text-primary ring-1 ring-inset ring-primary-soft-strong/60">
              <ReceiptText className="h-4 w-4" />
            </span>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-3xl font-bold tabular-nums tracking-tight text-gray-900">{money(thisTotal)}</p>
                <p className="mt-1 text-xs text-gray-500">
                  {paymentsThisMonth._count} pago(s) registrados
                </p>
              </div>
              {delta !== null ? (
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold ${
                    rising ? "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200/80" : "bg-red-50 text-red-700 ring-1 ring-inset ring-red-200/80"
                  }`}
                >
                  {rising ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                  {pct(delta)}
                </span>
              ) : (
                <span className="text-right text-xs text-gray-400">
                  Sin dato de comparación
                </span>
              )}
            </div>
            <div className="flex h-10 items-end gap-[3px]" aria-hidden="true">
              {byMonth.map((v, i) => {
                const isCurrent = i === currentMonth;
                return (
                  <div key={i} className="flex-1" title={`${MONTHS[i]}: ${money(v)}`}>
                    <div
                      className={`w-full rounded-t-sm transition-colors ${
                        isCurrent ? "bg-primary" : v > 0 ? "bg-primary/25" : "bg-gray-100"
                      }`}
                      style={{ height: `${Math.max((v / maxMonth) * 40, v > 0 || isCurrent ? 3 : 2)}px` }}
                    />
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between text-[10px] font-medium text-gray-400">
              <span>Ene</span>
              <span>Jun</span>
              <span>Dic</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-start justify-between">
            <div>
              <CardTitle>Asistencia hoy</CardTitle>
              <CardDescription>{formatDate(todayStart)}</CardDescription>
            </div>
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-soft text-primary ring-1 ring-inset ring-primary-soft-strong/60">
              <CalendarDays className="h-4 w-4" />
            </span>
          </CardHeader>
          <CardContent>
            {attTotal === 0 ? (
              <EmptyState
                icon={CalendarDays}
                title="Sin registros hoy"
                description="El registro de asistencia de hoy aparecerá aquí."
              />
            ) : (
              <div className="flex items-center gap-5">
                <AttendanceRing present={attPresent} total={attTotal} />
                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  {attendanceRows.map((r) => {
                    const Icon = r.icon;
                    return (
                      <div key={r.label} className="flex items-center gap-2">
                        <span className={`flex h-7 w-7 items-center justify-center rounded-lg ${r.tone}`}>
                          <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                        </span>
                        <span className="flex-1 truncate text-xs text-gray-600">{r.label}</span>
                        <span className="text-sm font-bold tabular-nums text-gray-900">{r.value}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Pendientes</CardTitle>
            <Link href="/admin/matriculas" className="text-sm font-medium text-primary hover:underline">
              Ver más
            </Link>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <Link
              href="/admin/matriculas"
              className="flex items-center gap-3 rounded-lg border border-gray-100 p-3 transition-colors hover:border-amber-200 hover:bg-amber-50/60"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                <ClipboardList className="h-4 w-4" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-800">Alumnos sin matrícula</p>
                <p className="text-xs text-gray-500">En el año académico activo</p>
              </div>
              <Badge tone={noEnrollment > 0 ? "amber" : "green"}>{noEnrollment}</Badge>
            </Link>
            <Link
              href="/admin/alumnos"
              className="flex items-center gap-3 rounded-lg border border-gray-100 p-3 transition-colors hover:border-primary-soft-strong hover:bg-primary-soft/40"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-soft text-primary">
                <UserRoundPlus className="h-4 w-4" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-800">Alumnos sin apoderado</p>
                <p className="text-xs text-gray-500">No podrán usar el portal de familias</p>
              </div>
              <Badge tone={noGuardian > 0 ? "amber" : "green"}>{noGuardian}</Badge>
            </Link>
            {!activeYear ? (
              <Link
                href="/admin/academic-years"
                className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                  <LayoutGrid className="h-4 w-4" />
                </div>
                <p className="text-sm font-medium text-amber-800">No hay año académico activo. Configurar</p>
              </Link>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-start justify-between">
            <div>
              <CardTitle>Recaudación por mes</CardTitle>
              <CardDescription>
                {activeYear ? `${activeYear.name} · Total ${money(totalMonto)}` : "Sin año activo"}
              </CardDescription>
            </div>
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-soft text-primary ring-1 ring-inset ring-primary-soft-strong/60">
              <TrendingUp className="h-4 w-4" />
            </span>
          </CardHeader>
          <CardContent>
            {payments.length === 0 ? (
              <EmptyState
                icon={Wallet}
                title="Sin pagos este año"
                description="Los pagos registrados aparecerán aquí."
              />
            ) : (
              <div className="flex flex-col gap-3">
                <div className="relative h-48">
                  <div className="absolute inset-y-0 left-0 flex w-11 flex-col justify-between pr-1.5 text-right" aria-hidden="true">
                    <span className="text-[10px] tabular-nums text-gray-400">{moneyShort(maxMonth)}</span>
                    <span className="text-[10px] tabular-nums text-gray-400">{moneyShort(maxMonth / 2)}</span>
                    <span className="-translate-y-1/2 text-[10px] tabular-nums text-gray-400">S/ 0</span>
                  </div>
                  <div className="absolute inset-0 left-11 flex flex-col justify-between" aria-hidden="true">
                    <div className="border-t border-dashed border-gray-100" />
                    <div className="border-t border-dashed border-gray-100" />
                    <div className="border-t border-gray-100" />
                  </div>
                  <div className="absolute inset-0 flex items-end gap-1.5 pl-11">
                    {byMonth.map((v, i) => {
                      const isCurrent = i === currentMonth;
                      return (
                        <div key={i} className="group relative flex flex-1 flex-col items-center justify-end gap-1.5">
                          <div className="relative flex h-40 w-full items-end justify-center">
                            <span className="absolute -top-5 z-10 hidden whitespace-nowrap rounded-md bg-gray-900 px-1.5 py-0.5 text-[10px] font-medium text-white shadow-lg group-hover:block">
                              {MONTHS[i]}: {money(v)}
                            </span>
                            <div
                              className={`w-full rounded-t-md transition-colors ${
                                isCurrent
                                  ? "bg-gradient-to-t from-primary to-primary/70"
                                  : "bg-gradient-to-t from-primary/80 to-primary/40 group-hover:from-primary group-hover:to-primary/70"
                              }`}
                              style={{ height: `${Math.max((v / maxMonth) * 100, v > 0 ? 4 : 1)}%` }}
                              title={`${MONTHS[i]}: ${money(v)}`}
                            />
                          </div>
                          <span
                            className={`text-[10px] font-medium ${
                              isCurrent ? "text-primary" : "text-gray-400"
                            }`}
                          >
                            {MONTHS[i]}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Alumnos por nivel</CardTitle>
            <CardDescription>
              {activeYear ? `Matriculados en ${activeYear.name}` : "Sin año activo"}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3.5">
            {levelRows.length === 0 ? (
              <EmptyState icon={GraduationCap} title="Sin matrículas" description="Aún no hay alumnos matriculados." />
            ) : (
              levelRows.map((r) => {
                const share = totalEnrolledLevels > 0 ? Math.round((r.count / totalEnrolledLevels) * 100) : 0;
                return (
                  <div key={r.name} className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-gray-700">{r.name}</span>
                      <span className="text-sm">
                        <span className="font-bold tabular-nums text-gray-900">{r.count}</span>
                        <span className="ml-1 text-xs text-gray-400">({share}%)</span>
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-primary to-primary/60 transition-all duration-500"
                        style={{ width: `${(r.count / maxLevel) * 100}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <CardTitle>Últimos pagos</CardTitle>
            <CardDescription>Registros más recientes del sistema</CardDescription>
          </div>
          <Link href="/admin/pagos">
            <Button variant="ghost" size="sm" className="text-primary hover:bg-primary-soft hover:text-primary-strong">
              Ver todos <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {recent.length === 0 ? (
            <EmptyState icon={Wallet} title="Sin pagos recientes" description="Registra el primer pago." />
          ) : (
            <div className="flex flex-col divide-y divide-gray-100">
              {recent.map((p) => (
                <div key={p.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-soft text-xs font-bold text-primary ring-1 ring-inset ring-primary-soft-strong">
                      {initials(`${p.student.firstName} ${p.student.lastName}`)}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-gray-800">
                        {p.student.lastName}, {p.student.firstName}
                      </p>
                      <p className="truncate text-xs text-gray-500">
                        {p.concept.name} · {formatDate(p.date)}
                      </p>
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-bold tabular-nums text-gray-900">{money(Number(p.amount))}</p>
                    <p className="font-mono text-[10px] text-gray-400">{p.receiptNumber}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
