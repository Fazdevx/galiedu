import { prisma } from "@/lib/prisma";
import { Badge, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { NotasGrid } from "@/components/admin/notas-grid";
import { NotasSelects, type SectionGroup } from "@/components/admin/notas-selects";
import { Term } from "@/generated/prisma/client";

export const metadata = { title: "Notas" };

const TERM_LABELS: Record<Term, string> = {
  P1: "Período 1",
  P2: "Período 2",
  P3: "Período 3",
  P4: "Período 4",
};

const VALID_TERMS: Term[] = ["P1", "P2", "P3", "P4"];

export default async function GradesPage({
  searchParams,
}: {
  searchParams: Promise<{ section?: string; term?: string }>;
}) {
  const sp = await searchParams;
  const termRaw = sp.term && (VALID_TERMS as string[]).includes(sp.term) ? sp.term as Term : "P1";
  const sectionId = sp.section?.trim() || null;

  const sections = await prisma.section.findMany({
    orderBy: [{ academicYear: { year: "desc" } }, { grade: { level: { order: "asc" } } }, { grade: { order: "asc" } }],
    include: { grade: { include: { level: true } }, academicYear: true },
  });

  const groups: SectionGroup[] = [];
  const groupMap = new Map<string, SectionGroup>();
  for (const s of sections) {
    const key = `${s.academicYear.year}|${s.grade.level.order}|${s.grade.order}|${s.grade.level.id}|${s.grade.id}`;
    const label = `${s.academicYear.name} · ${s.grade.level.name} · ${s.grade.name}`;
    const existing = groupMap.get(key);
    if (existing) {
      existing.options.push({ value: s.id, label: s.name });
    } else {
      const group = { label, options: [{ value: s.id, label: s.name }] };
      groupMap.set(key, group);
      groups.push(group);
    }
  }

  let grid = null;
  let selectedLabel: string | null = null;

  if (sectionId) {
    const section = await prisma.section.findUnique({
      where: { id: sectionId },
      include: { grade: { include: { level: true } }, academicYear: true },
    });

    if (section) {
      selectedLabel = `${section.grade.level.name} · ${section.grade.name} · ${section.name} (${section.academicYear.name})`;

      const [courses, enrollments, recordGrades] = await Promise.all([
        prisma.course.findMany({ where: { gradeId: section.gradeId }, orderBy: { order: "asc" } }),
        prisma.enrollment.findMany({
          where: { sectionId, status: "ENROLLED" },
          include: { student: true },
        }),
        prisma.recordGrade.findMany({
          where: { course: { gradeId: section.gradeId }, term: termRaw },
        }),
      ]);

      const initialGrades: Record<string, Record<string, number | null>> = {};
      for (const rg of recordGrades) {
        if (!initialGrades[rg.studentId]) initialGrades[rg.studentId] = {};
        initialGrades[rg.studentId][rg.courseId] = rg.score;
      }

      grid = (
        <NotasGrid
          students={enrollments
            .sort((a, b) => a.student.lastName.localeCompare(b.student.lastName))
            .map((en) => ({ id: en.student.id, name: `${en.student.lastName}, ${en.student.firstName}` }))}
          courses={courses.map((c) => ({ id: c.id, name: c.name }))}
          initialGrades={initialGrades}
          term={termRaw}
        />
      );
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Notas</h1>
          <Badge tone="blue">{TERM_LABELS[termRaw]}</Badge>
        </div>
        <p className="text-sm text-gray-500">
          Selecciona una sección y un período para registrar calificaciones.
        </p>
      </div>

      <Card>
        <CardHeader className="gap-4">
          <NotasSelects groups={groups} sectionId={sectionId} term={termRaw} />
        </CardHeader>
      </Card>

      {grid ? (
        <Card>
          <CardHeader>
            <CardTitle>{selectedLabel ?? "Sección"}</CardTitle>
            <CardDescription>
              Notas del {TERM_LABELS[termRaw]} · guarda los cambios al final.
            </CardDescription>
          </CardHeader>
          <CardContent>{grid}</CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-10 text-center text-sm text-gray-400">
            Elige una sección para comenzar a registrar notas.
          </CardContent>
        </Card>
      )}
    </div>
  );
}