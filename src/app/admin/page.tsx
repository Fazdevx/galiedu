import Link from "next/link";
import {
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Clock,
  GraduationCap,
  LayoutGrid,
  ReceiptText,
  TrendingDown,
  TrendingUp,
  UserRoundPlus,
  Users,
  Wallet,
  XCircle,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatDate, monthRangeUTC } from "@/lib/date";
import { Badge, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { AttendanceStatus } from "@/generated/prisma/client";
import { OnboardingChecklist } from "@/app/admin/onboarding";

export const metadata = { title: "Dashboard" };

const MONTHS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

function money(n: number) {
  return `S/ ${n.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function pct(n: number) {
  return `${n >= 0 ? "+" : ""}${n.toLocaleString("es-PE", { maximumFractionDigits: 0 })}%`;
}

export default async function AdminDashboardPage() {
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
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500">
          {activeYear ? (
            <>
              Resumen de <span className="font-medium text-gray-700">{activeYear.name}</span>, {MONTHS[now.getMonth()].toLowerCase()} {now.getFullYear()}.
            </>
          ) : (
            "Resumen general del sistema."
          )}
        </p>
      </div>

      <OnboardingChecklist />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <Link key={s.label} href={s.href}>
              <Card className="transition-all hover:-translate-y-0.5 hover:border-primary-soft-strong hover:shadow-md">
                <CardContent className="flex items-center gap-3 p-4 pt-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-soft text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-2xl font-semibold leading-none text-gray-900">{s.value}</p>
                    <p className="mt-1 text-xs text-gray-500">{s.label}</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Recaudación del mes</CardTitle>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-soft text-primary">
              <ReceiptText className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <p className="text-2xl font-semibold text-gray-900">{money(thisTotal)}</p>
            <p className="text-xs text-gray-500">{paymentsThisMonth._count} pago(s) en {MONTHS[now.getMonth()].toLowerCase()}</p>
            {delta !== null ? (
              <span
                className={`inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                  rising ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                }`}
              >
                {rising ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                {pct(delta)} vs. {MONTHS[now.getMonth() - 1 < 0 ? 11 : now.getMonth() - 1]}
              </span>
            ) : (
              <span className="text-xs text-gray-400">Necesitas dos meses con pagos para ver la tendencia.</span>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Asistencia hoy</CardTitle>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-soft text-primary">
              <CalendarDays className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            {attTotal === 0 ? (
              <EmptyState
                icon={CalendarDays}
                title="Sin registros hoy"
                description="El registro de asistencia de hoy aparecerá aquí."
              />
            ) : (
              <div className="flex flex-col gap-2.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Total registrado</span>
                  <span className="font-semibold text-gray-900">{attTotal}</span>
                </div>
                {attendanceRows.map((r) => {
                  const Icon = r.icon;
                  return (
                    <div key={r.label} className="flex items-center gap-2.5">
                      <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${r.tone}`}>
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="flex-1 text-sm text-gray-600">{r.label}</span>
                      <span className="text-sm font-semibold text-gray-900">{r.value}</span>
                    </div>
                  );
                })}
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
            <Link href="/admin/matriculas" className="flex items-center gap-3 rounded-lg border border-gray-100 p-3 transition-colors hover:bg-gray-50">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                <ClipboardList className="h-4 w-4" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-800">Alumnos sin matrícula</p>
                <p className="text-xs text-gray-500">En el año académico activo</p>
              </div>
              <Badge tone={noEnrollment > 0 ? "amber" : "green"}>{noEnrollment}</Badge>
            </Link>
            <Link href="/admin/alumnos" className="flex items-center gap-3 rounded-lg border border-gray-100 p-3 transition-colors hover:bg-gray-50">
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
              <Link href="/admin/academic-years" className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                  <LayoutGrid className="h-4 w-4" />
                </div>
                <p className="text-sm font-medium text-amber-800">No hay año académico activo. Configurar</p>
              </Link>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle>Recaudación por mes</CardTitle>
              <CardDescription>
                {activeYear ? `${activeYear.name} · Total ${money(totalMonto)}` : "Sin año activo"}
              </CardDescription>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-soft text-primary">
              <TrendingUp className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            {payments.length === 0 ? (
              <EmptyState
                icon={Wallet}
                title="Sin pagos este año"
                description="Los pagos registrados aparecerán aquí."
              />
            ) : (
              <div className="flex h-44 items-end gap-1.5">
                {byMonth.map((v, i) => (
                  <div key={i} className="group flex flex-1 flex-col items-center gap-1.5">
                    <div className="relative flex h-36 w-full items-end justify-center">
                      {v > 0 ? (
                        <span className="absolute -top-5 hidden text-[10px] font-medium text-gray-500 group-hover:block">
                          {money(v)}
                        </span>
                      ) : null}
                      <div
                        className="w-full rounded-t bg-primary/80 transition-colors group-hover:bg-primary"
                        style={{ height: `${Math.max((v / maxMonth) * 100, v > 0 ? 4 : 0)}%` }}
                        title={`${MONTHS[i]}: ${money(v)}`}
                      />
                    </div>
                    <span className="text-[10px] text-gray-400">{MONTHS[i]}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Alumnos por nivel</CardTitle>
            <CardDescription>{activeYear ? "Matriculados en el año activo" : "Sin año activo"}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {levelRows.length === 0 ? (
              <EmptyState icon={GraduationCap} title="Sin matrículas" description="Aún no hay alumnos matriculados." />
            ) : (
              levelRows.map((r) => (
                <div key={r.name} className="flex flex-col gap-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-700">{r.name}</span>
                    <span className="font-medium text-gray-900">{r.count}</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${(r.count / maxLevel) * 100}%` }} />
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Últimos pagos</CardTitle>
          <Link href="/admin/pagos" className="text-sm font-medium text-primary hover:underline">
            Ver todos
          </Link>
        </CardHeader>
        <CardContent>
          {recent.length === 0 ? (
            <EmptyState icon={Wallet} title="Sin pagos recientes" description="Registra el primer pago." />
          ) : (
            <div className="flex flex-col divide-y divide-gray-100">
              {recent.map((p) => (
                <div key={p.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-gray-800">
                      {p.student.lastName}, {p.student.firstName}
                    </p>
                    <p className="truncate text-xs text-gray-500">
                      {p.concept.name} · {formatDate(p.date)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-900">{money(Number(p.amount))}</p>
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