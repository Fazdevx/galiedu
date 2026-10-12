"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin, isStaff } from "@/lib/roles";
import { dayRangeUTC, parseDateOnly } from "@/lib/date";
import { buildReceiptNumber, isUniqueViolation } from "@/lib/receipts";
import { Prisma, type Role, type Term, type AcademyDay, type AcademyEnrollmentStatus, type PaymentMethod, type AttendanceStatus } from "@/generated/prisma/client";

async function requireAdmin(): Promise<FormState | null> {
  const session = await auth();
  const role = session?.user?.role;
  if (!role || !isAdmin(role)) return DENIED;
  return null;
}

async function requireStaff(): Promise<FormState | null> {
  const session = await auth();
  const role = session?.user?.role;
  if (!role || !isStaff(role)) return DENIED;
  return null;
}

function formString(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

export type FormState = { error?: string; success?: string };
const OK: FormState = {};
const DENIED: FormState = { error: "No tienes permisos para realizar esta acción." };

// ---------------------------------------------------------------------------
// Años académicos
// ---------------------------------------------------------------------------

const academicYearSchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100),
  name: z.string().min(3).max(100),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export async function createAcademicYear(_prev: FormState, formData: FormData): Promise<FormState> {
  const denied = await requireAdmin();
  if (denied) return denied;

  const parsed = academicYearSchema.safeParse({
    year: formData.get("year"),
    name: formData.get("name"),
    startDate: formData.get("startDate") || undefined,
    endDate: formData.get("endDate") || undefined,
  });
  if (!parsed.success) return { error: "Datos inválidos." };

  try {
    await prisma.academicYear.create({
      data: {
        year: parsed.data.year,
        name: parsed.data.name,
        startDate: parsed.data.startDate ? parseDateOnly(parsed.data.startDate) : null,
        endDate: parsed.data.endDate ? parseDateOnly(parsed.data.endDate) : null,
      },
    });
  } catch {
    return { error: "Ya existe un año académico con ese número." };
  }

  revalidatePath("/admin/academic-years");
  return OK;
}

export async function setActiveAcademicYear(formData: FormData): Promise<FormState> {
  const denied = await requireAdmin();
  if (denied) return denied;
  const id = formString(formData, "id");
  if (!id) return { error: "Año académico no válido." };

  try {
    await prisma.$transaction([
      prisma.academicYear.updateMany({ data: { isActive: false } }),
      prisma.academicYear.update({ where: { id }, data: { isActive: true } }),
    ]);
  } catch {
    return { error: "No se pudo activar el año académico." };
  }

  revalidatePath("/admin/academic-years");
  return OK;
}

export async function deleteAcademicYear(formData: FormData): Promise<FormState> {
  const denied = await requireAdmin();
  if (denied) return denied;
  const id = formString(formData, "id");
  if (!id) return { error: "Año académico no válido." };

  try {
    await prisma.academicYear.delete({ where: { id } });
  } catch {
    return { error: "No se pudo eliminar: el año tiene pagos o asistencias asociadas." };
  }
  revalidatePath("/admin/academic-years");
  return OK;
}

// ---------------------------------------------------------------------------
// Niveles
// ---------------------------------------------------------------------------

const levelSchema = z.object({
  name: z.string().min(2).max(100),
  type: z.enum(["INICIAL", "PRIMARIA", "SECUNDARIA", "ACADEMIA"]),
  order: z.coerce.number().int().min(0).default(0),
});

export async function createLevel(_prev: FormState, formData: FormData): Promise<FormState> {
  const denied = await requireAdmin();
  if (denied) return denied;

  const parsed = levelSchema.safeParse({
    name: formData.get("name"),
    type: formData.get("type"),
    order: formData.get("order") || 0,
  });
  if (!parsed.success) return { error: "Datos inválidos." };

  try {
    await prisma.level.create({
      data: {
        name: parsed.data.name,
        type: parsed.data.type,
        order: parsed.data.order,
      },
    });
  } catch {
    return { error: "Ese tipo de nivel ya existe." };
  }

  revalidatePath("/admin/niveles");
  return OK;
}

export async function deleteLevel(formData: FormData): Promise<FormState> {
  const denied = await requireAdmin();
  if (denied) return denied;
  const id = formString(formData, "id");
  if (!id) return { error: "Nivel no válido." };

  try {
    await prisma.level.delete({ where: { id } });
  } catch {
    return { error: "No se pudo eliminar: el nivel tiene datos asociados." };
  }
  revalidatePath("/admin/niveles");
  return OK;
}

// ---------------------------------------------------------------------------
// Grados
// ---------------------------------------------------------------------------

const gradeSchema = z.object({
  levelId: z.string().min(1),
  name: z.string().min(1).max(50),
  order: z.coerce.number().int().min(0).default(0),
});

export async function createGrade(_prev: FormState, formData: FormData): Promise<FormState> {
  const denied = await requireAdmin();
  if (denied) return denied;

  const parsed = gradeSchema.safeParse({
    levelId: formData.get("levelId"),
    name: formData.get("name"),
    order: formData.get("order") || 0,
  });
  if (!parsed.success) return { error: "Datos inválidos." };

  try {
    await prisma.grade.create({
      data: {
        levelId: parsed.data.levelId,
        name: parsed.data.name,
        order: parsed.data.order,
      },
    });
  } catch {
    return { error: "Ese grado ya existe para este nivel." };
  }

  revalidatePath("/admin/grados");
  return OK;
}

export async function deleteGrade(formData: FormData): Promise<FormState> {
  const denied = await requireAdmin();
  if (denied) return denied;
  const id = formString(formData, "id");
  if (!id) return { error: "Grado no válido." };

  try {
    await prisma.grade.delete({ where: { id } });
  } catch {
    return { error: "No se pudo eliminar: el grado tiene datos asociados." };
  }
  revalidatePath("/admin/grados");
  return OK;
}

// ---------------------------------------------------------------------------
// Secciones
// ---------------------------------------------------------------------------

const sectionSchema = z.object({
  gradeId: z.string().min(1),
  academicYearId: z.string().min(1),
  name: z.string().min(1).max(20),
  capacity: z.coerce.number().int().min(1).default(30),
});

export async function createSection(_prev: FormState, formData: FormData): Promise<FormState> {
  const denied = await requireAdmin();
  if (denied) return denied;

  const parsed = sectionSchema.safeParse({
    gradeId: formData.get("gradeId"),
    academicYearId: formData.get("academicYearId"),
    name: formData.get("name"),
    capacity: formData.get("capacity") || 30,
  });
  if (!parsed.success) return { error: "Datos inválidos." };

  try {
    await prisma.section.create({
      data: {
        gradeId: parsed.data.gradeId,
        academicYearId: parsed.data.academicYearId,
        name: parsed.data.name,
        capacity: parsed.data.capacity,
      },
    });
  } catch {
    return { error: "Esa sección ya existe para grado y año académico." };
  }

  revalidatePath("/admin/secciones");
  return OK;
}

export async function deleteSection(formData: FormData): Promise<FormState> {
  const denied = await requireAdmin();
  if (denied) return denied;
  const id = formString(formData, "id");
  if (!id) return { error: "Sección no válida." };

  try {
    await prisma.section.delete({ where: { id } });
  } catch {
    return { error: "No se pudo eliminar: la sección tiene matrículas o asistencias." };
  }
  revalidatePath("/admin/secciones");
  return OK;
}

// ---------------------------------------------------------------------------
// Usuarios
// ---------------------------------------------------------------------------

const userSchema = z.object({
  name: z.string().min(2).max(150),
  email: z.string().email(),
  role: z.enum(["SUPER_ADMIN", "ADMIN", "DIRECTOR", "COORDINADOR", "PROFESOR", "ALUMNO", "APODERADO"]),
  status: z.enum(["ACTIVE", "INACTIVE", "SUSPENDED"]).default("ACTIVE"),
  password: z.string().min(6),
});

export async function createUser(_prev: FormState, formData: FormData): Promise<FormState> {
  const denied = await requireAdmin();
  if (denied) return denied;

  const parsed = userSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    role: formData.get("role"),
    status: formData.get("status") || "ACTIVE",
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: "Datos inválidos. La contraseña debe tener al menos 6 caracteres." };

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);

  try {
    await prisma.user.create({
      data: {
        name: parsed.data.name,
        email: parsed.data.email.toLowerCase(),
        role: parsed.data.role as Role,
        status: parsed.data.status,
        passwordHash,
      },
    });
  } catch {
    return { error: "Ya existe un usuario con ese correo." };
  }

  revalidatePath("/admin/usuarios");
  return OK;
}

export async function updateUserStatus(formData: FormData): Promise<FormState> {
  const denied = await requireAdmin();
  if (denied) return denied;
  const id = formString(formData, "id");
  const status = formString(formData, "status");
  if (!id || !["ACTIVE", "INACTIVE", "SUSPENDED"].includes(status)) {
    return { error: "Datos inválidos." };
  }

  const session = await auth();
  if (session?.user?.id === id && status !== "ACTIVE") {
    return { error: "No puedes desactivar tu propia cuenta." };
  }

  const target = await prisma.user.findUnique({ where: { id }, select: { role: true } });
  if (!target) return { error: "Usuario no encontrado." };

  if (target.role === "SUPER_ADMIN" && status !== "ACTIVE") {
    const activeSupers = await prisma.user.count({ where: { role: "SUPER_ADMIN", status: "ACTIVE" } });
    if (activeSupers <= 1) {
      return { error: "Debe existir al menos un super administrador activo." };
    }
  }

  try {
    await prisma.user.update({ where: { id }, data: { status } as never });
  } catch {
    return { error: "No se pudo actualizar el estado del usuario." };
  }
  revalidatePath("/admin/usuarios");
  return OK;
}

export async function deleteUser(formData: FormData): Promise<FormState> {
  const denied = await requireAdmin();
  if (denied) return denied;
  const id = formString(formData, "id");
  if (!id) return { error: "Usuario no válido." };

  const session = await auth();
  if (session?.user?.id === id) {
    return { error: "No puedes eliminar tu propia cuenta." };
  }

  const target = await prisma.user.findUnique({ where: { id }, select: { role: true } });
  if (!target) return { error: "Usuario no encontrado." };

  if (target.role === "SUPER_ADMIN") {
    const supers = await prisma.user.count({ where: { role: "SUPER_ADMIN" } });
    if (supers <= 1) {
      return { error: "No puedes eliminar al único super administrador." };
    }
  }

  try {
    await prisma.user.delete({ where: { id } });
  } catch {
    return { error: "No se pudo eliminar el usuario." };
  }
  revalidatePath("/admin/usuarios");
  return OK;
}

// ---------------------------------------------------------------------------
// Alumnos
// ---------------------------------------------------------------------------

const studentSchema = z.object({
  firstName: z.string().min(2).max(100),
  lastName: z.string().min(2).max(100),
  document: z.string().min(7).max(20).optional().or(z.literal("")),
  birthDate: z.string().optional().or(z.literal("")),
  gender: z.enum(["MASCULINO", "FEMENINO"]).optional().or(z.literal("")),
  guardianName: z.string().max(150).optional().or(z.literal("")),
  guardianPhone: z.string().max(30).optional().or(z.literal("")),
  guardianEmail: z.string().email().optional().or(z.literal("")),
  guardianUserId: z.string().optional().or(z.literal("")),
  status: z.enum(["ACTIVE", "INACTIVE", "SUSPENDED"]).default("ACTIVE"),
});

function studentData(formData: FormData) {
  return studentSchema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    document: formData.get("document") || undefined,
    birthDate: formData.get("birthDate") || undefined,
    gender: formData.get("gender") || undefined,
    guardianName: formData.get("guardianName") || undefined,
    guardianPhone: formData.get("guardianPhone") || undefined,
    guardianEmail: formData.get("guardianEmail") || undefined,
    guardianUserId: formData.get("guardianUserId") || undefined,
    status: formData.get("status") || "ACTIVE",
  });
}

export async function createStudent(_prev: FormState, formData: FormData): Promise<FormState> {
  const denied = await requireAdmin();
  if (denied) return denied;

  const parsed = studentData(formData);
  if (!parsed.success) return { error: "Datos inválidos. Revisa la ficha del alumno." };

  try {
    await prisma.student.create({
      data: {
        firstName: parsed.data.firstName,
        lastName: parsed.data.lastName,
        document: parsed.data.document || null,
        birthDate: parsed.data.birthDate ? parseDateOnly(parsed.data.birthDate) : null,
        gender: parsed.data.gender || null,
        guardianName: parsed.data.guardianName || null,
        guardianPhone: parsed.data.guardianPhone || null,
        guardianEmail: parsed.data.guardianEmail || null,
        guardianUserId: parsed.data.guardianUserId || null,
        status: parsed.data.status,
      },
    });
  } catch {
    return { error: "Ya existe un alumno con ese documento (DNI/CI)." };
  }

  revalidatePath("/admin/alumnos");
  return OK;
}

export async function updateStudent(_prev: FormState, formData: FormData): Promise<FormState> {
  const denied = await requireAdmin();
  if (denied) return denied;

  const id = formString(formData, "id");
  if (!id) return { error: "Falta el identificador del alumno." };

  const parsed = studentData(formData);
  if (!parsed.success) return { error: "Datos inválidos. Revisa la ficha del alumno." };

  try {
    await prisma.student.update({
      where: { id },
      data: {
        firstName: parsed.data.firstName,
        lastName: parsed.data.lastName,
        document: parsed.data.document || null,
        birthDate: parsed.data.birthDate ? parseDateOnly(parsed.data.birthDate) : null,
        gender: parsed.data.gender || null,
        guardianName: parsed.data.guardianName || null,
        guardianPhone: parsed.data.guardianPhone || null,
        guardianEmail: parsed.data.guardianEmail || null,
        guardianUserId: parsed.data.guardianUserId || null,
        status: parsed.data.status,
      },
    });
  } catch {
    return { error: "Ese documento (DNI/CI) ya pertenece a otro alumno." };
  }

  revalidatePath("/admin/alumnos");
  revalidatePath(`/admin/alumnos/${id}`);
  return OK;
}

export async function deleteStudent(formData: FormData): Promise<FormState> {
  const denied = await requireAdmin();
  if (denied) return denied;
  const id = formString(formData, "id");
  if (!id) return { error: "Alumno no válido." };

  try {
    await prisma.student.delete({ where: { id } });
  } catch {
    return { error: "No se pudo eliminar el alumno." };
  }
  revalidatePath("/admin/alumnos");
  revalidatePath("/admin/matriculas");
  return OK;
}

// ---------------------------------------------------------------------------
// Matrículas
// ---------------------------------------------------------------------------

const enrollmentSchema = z.object({
  studentId: z.string().min(1),
  sectionId: z.string().min(1),
  academicYearId: z.string().min(1),
  status: z.enum(["PENDING", "ENROLLED", "WITHDRAWN"]).default("ENROLLED"),
  notes: z.string().max(300).optional().or(z.literal("")),
});

export async function createEnrollment(_prev: FormState, formData: FormData): Promise<FormState> {
  const denied = await requireAdmin();
  if (denied) return denied;

  const parsed = enrollmentSchema.safeParse({
    studentId: formData.get("studentId"),
    sectionId: formData.get("sectionId"),
    academicYearId: formData.get("academicYearId"),
    status: formData.get("status") || "ENROLLED",
    notes: formData.get("notes") || undefined,
  });
  if (!parsed.success) return { error: "Datos inválidos. Completa alumno, sección y año." };

  try {
    await prisma.enrollment.create({
      data: {
        studentId: parsed.data.studentId,
        sectionId: parsed.data.sectionId,
        academicYearId: parsed.data.academicYearId,
        status: parsed.data.status,
        notes: parsed.data.notes || null,
      },
    });
  } catch {
    return { error: "Ese alumno ya está matriculado este año académico." };
  }

  revalidatePath("/admin/matriculas");
  revalidatePath("/admin/alumnos");
  return OK;
}

export async function updateEnrollmentStatus(formData: FormData): Promise<FormState> {
  const denied = await requireAdmin();
  if (denied) return denied;
  const id = formString(formData, "id");
  const status = formString(formData, "status");
  if (!id || !["PENDING", "ENROLLED", "WITHDRAWN"].includes(status)) {
    return { error: "Datos inválidos." };
  }

  try {
    await prisma.enrollment.update({ where: { id }, data: { status } as never });
  } catch {
    return { error: "No se pudo actualizar la matrícula." };
  }
  revalidatePath("/admin/matriculas");
  return OK;
}

export async function deleteEnrollment(formData: FormData): Promise<FormState> {
  const denied = await requireAdmin();
  if (denied) return denied;
  const id = formString(formData, "id");
  if (!id) return { error: "Matrícula no válida." };

  try {
    await prisma.enrollment.delete({ where: { id } });
  } catch {
    return { error: "No se pudo eliminar la matrícula." };
  }
  revalidatePath("/admin/matriculas");
  revalidatePath("/admin/alumnos");
  return OK;
}

// ---------------------------------------------------------------------------
// Cursos
// ---------------------------------------------------------------------------

const courseSchema = z.object({
  gradeId: z.string().min(1),
  name: z.string().min(1).max(100),
  order: z.coerce.number().int().min(0).default(0),
});

export async function createCourse(_prev: FormState, formData: FormData): Promise<FormState> {
  const denied = await requireAdmin();
  if (denied) return denied;

  const parsed = courseSchema.safeParse({
    gradeId: formData.get("gradeId"),
    name: formData.get("name"),
    order: formData.get("order") || 0,
  });
  if (!parsed.success) return { error: "Datos inválidos." };

  try {
    await prisma.course.create({
      data: {
        gradeId: parsed.data.gradeId,
        name: parsed.data.name,
        order: parsed.data.order,
      },
    });
  } catch {
    return { error: "Ese curso ya existe para este grado." };
  }

  revalidatePath("/admin/cursos");
  return OK;
}

export async function deleteCourse(formData: FormData): Promise<FormState> {
  const denied = await requireAdmin();
  if (denied) return denied;
  const id = formString(formData, "id");
  if (!id) return { error: "Curso no válido." };

  try {
    await prisma.course.delete({ where: { id } });
  } catch {
    return { error: "No se pudo eliminar el curso." };
  }
  revalidatePath("/admin/cursos");
  revalidatePath("/admin/notas");
  return OK;
}

// ---------------------------------------------------------------------------
// Notas
// ---------------------------------------------------------------------------

const gradesToSaveSchema = z.array(
  z.object({
    studentId: z.string().min(1),
    courseId: z.string().min(1),
    score: z.number().min(0).max(20).nullable(),
  }),
);

export async function saveGrades(_prev: FormState, formData: FormData): Promise<FormState> {
  const denied = await requireStaff();
  if (denied) return denied;

  const raw = formData.get("grades");
  if (typeof raw !== "string") return { error: "No se recibieron notas." };

  let items: unknown;
  try {
    items = JSON.parse(raw);
  } catch {
    return { error: "Formato de notas inválido." };
  }

  const parsed = gradesToSaveSchema.safeParse(items);
  if (!parsed.success) return { error: "Notas inválidas. Revisa que estén entre 0 y 20." };

  const termRaw = formData.get("term");
  if (typeof termRaw !== "string" || !["P1", "P2", "P3", "P4"].includes(termRaw)) {
    return { error: "Periodo inválido." };
  }
  const term = termRaw as Term;

  const studentIds = [...new Set(parsed.data.map((i) => i.studentId))];
  const courseIds = [...new Set(parsed.data.map((i) => i.courseId))];

  const [courses, enrollments] = await Promise.all([
    prisma.course.findMany({ where: { id: { in: courseIds } }, select: { id: true, gradeId: true } }),
    prisma.enrollment.findMany({
      where: { studentId: { in: studentIds }, status: "ENROLLED" },
      select: { studentId: true, section: { select: { gradeId: true } } },
    }),
  ]);

  const courseGrade = new Map(courses.map((c) => [c.id, c.gradeId]));
  if (courseGrade.size !== courseIds.length) return { error: "Alguno de los cursos no existe." };

  const allowed = new Set(enrollments.map((e) => `${e.studentId}:${e.section.gradeId}`));
  const invalid = parsed.data.some((item) => {
    const gradeId = courseGrade.get(item.courseId);
    return !gradeId || !allowed.has(`${item.studentId}:${gradeId}`);
  });
  if (invalid) {
    return { error: "Hay alumnos que no están matriculados en el grado de esos cursos." };
  }

  try {
    await prisma.$transaction(
      parsed.data.map((item) =>
        prisma.recordGrade.upsert({
          where: { studentId_courseId_term: { studentId: item.studentId, courseId: item.courseId, term } },
          update: { score: item.score },
          create: { studentId: item.studentId, courseId: item.courseId, term, score: item.score },
        }),
      ),
    );
  } catch {
    return { error: "No se pudieron guardar las notas." };
  }

  revalidatePath("/admin/notas");
  return OK;
}

// ---------------------------------------------------------------------------
// Asistencia
// ---------------------------------------------------------------------------

const attendanceSaveSchema = z.object({
  sectionId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida"),
  records: z
    .array(
      z.object({
        studentId: z.string().min(1),
        status: z.enum(["PRESENT", "ABSENT", "LATE", "JUSTIFIED"]),
      }),
    )
    .min(1),
});

function dayRange(dateStr: string) {
  return dayRangeUTC(dateStr);
}

export async function saveAttendance(_prev: FormState, formData: FormData): Promise<FormState> {
  const denied = await requireStaff();
  if (denied) return denied;

  const sectionId = formString(formData, "sectionId");
  const date = formString(formData, "date");
  const raw = formData.get("records");

  if (typeof raw !== "string") return { error: "No se recibieron registros de asistencia." };

  let records: unknown;
  try {
    records = JSON.parse(raw);
  } catch {
    return { error: "Formato de registro inválido." };
  }

  const parsed = attendanceSaveSchema.safeParse({ sectionId, date, records });
  if (!parsed.success) return { error: "Datos de asistencia inválidos." };

  const section = await prisma.section.findUnique({
    where: { id: sectionId },
    select: { academicYearId: true },
  });
  if (!section) return { error: "Sección no encontrada." };

  const enrolled = await prisma.enrollment.findMany({
    where: { sectionId, status: "ENROLLED" },
    select: { studentId: true },
  });
  const allowedStudents = new Set(enrolled.map((e) => e.studentId));

  const byStudent = new Map<string, AttendanceStatus>();
  for (const record of parsed.data.records) {
    if (!allowedStudents.has(record.studentId)) {
      return { error: "Hay alumnos que no pertenecen a esta sección." };
    }
    byStudent.set(record.studentId, record.status);
  }

  const { start, end } = dayRange(parsed.data.date);

  try {
    await prisma.$transaction([
      prisma.attendance.deleteMany({ where: { sectionId, date: { gte: start, lt: end } } }),
      prisma.attendance.createMany({
        data: [...byStudent.entries()].map(([studentId, status]) => ({
          sectionId,
          academicYearId: section.academicYearId,
          date: start,
          studentId,
          status,
        })),
      }),
    ]);
  } catch {
    return { error: "No se pudo guardar la asistencia." };
  }

  revalidatePath("/admin/asistencia");
  return OK;
}

// ---------------------------------------------------------------------------
// Academia
// ---------------------------------------------------------------------------

const academyCourseSchema = z.object({
  name: z.string().min(2).max(150),
  description: z.string().max(500).optional().or(z.literal("")),
  price: z.coerce.number().min(0).optional().or(z.literal("")),
});

export async function createAcademyCourse(_prev: FormState, formData: FormData): Promise<FormState> {
  const denied = await requireAdmin();
  if (denied) return denied;

  const parsed = academyCourseSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    price: formData.get("price") || undefined,
  });
  if (!parsed.success) return { error: "Datos inválidos. Revisa el nombre y el precio." };

  try {
    await prisma.academyCourse.create({
      data: {
        name: parsed.data.name,
        description: parsed.data.description || null,
        price: parsed.data.price === undefined || parsed.data.price === ""
          ? null
          : new Prisma.Decimal(Number(parsed.data.price)),
      },
    });
  } catch {
    return { error: "No se pudo crear el curso." };
  }

  revalidatePath("/admin/academia/cursos");
  return OK;
}

export async function toggleAcademyCourse(formData: FormData): Promise<FormState> {
  const denied = await requireAdmin();
  if (denied) return denied;
  const id = formString(formData, "id");
  if (!id) return { error: "Curso no válido." };

  const curso = await prisma.academyCourse.findUnique({ where: { id }, select: { active: true } });
  if (!curso) return { error: "Curso no encontrado." };
  try {
    await prisma.academyCourse.update({ where: { id }, data: { active: !curso.active } });
  } catch {
    return { error: "No se pudo actualizar el curso." };
  }
  revalidatePath("/admin/academia/cursos");
  return OK;
}

export async function deleteAcademyCourse(formData: FormData): Promise<FormState> {
  const denied = await requireAdmin();
  if (denied) return denied;
  const id = formString(formData, "id");
  if (!id) return { error: "Curso no válido." };

  try {
    await prisma.academyCourse.delete({ where: { id } });
  } catch {
    return { error: "No se pudo eliminar: el curso tiene inscripciones asociadas." };
  }
  revalidatePath("/admin/academia/cursos");
  return OK;
}

// ---- Horarios y grupos ----

const academyDaySchema = z.enum(["LUNES", "MARTES", "MIERCOLES", "JUEVES", "VIERNES", "SABADO", "DOMINGO"]);

const academyScheduleSchema = z.object({
  courseId: z.string().min(1),
  name: z.string().min(1).max(60),
  day: academyDaySchema,
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "Hora inválida"),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, "Hora inválida"),
  teacherName: z.string().max(150).optional().or(z.literal("")),
});

export async function createAcademySchedule(_prev: FormState, formData: FormData): Promise<FormState> {
  const denied = await requireAdmin();
  if (denied) return denied;

  const parsed = academyScheduleSchema.safeParse({
    courseId: formData.get("courseId"),
    name: formData.get("name"),
    day: formData.get("day"),
    startTime: formData.get("startTime"),
    endTime: formData.get("endTime"),
    teacherName: formData.get("teacherName") || undefined,
  });
  if (!parsed.success) return { error: "Datos del horario inválidos. Usa formato HH:MM." };

  try {
    await prisma.academySchedule.create({
      data: {
        courseId: parsed.data.courseId,
        name: parsed.data.name,
        day: parsed.data.day as AcademyDay,
        startTime: parsed.data.startTime,
        endTime: parsed.data.endTime,
        teacherName: parsed.data.teacherName || null,
      },
    });
  } catch {
    return { error: "No se pudo crear el grupo/horario." };
  }

  revalidatePath("/admin/academia/cursos");
  return OK;
}

export async function deleteAcademySchedule(formData: FormData): Promise<FormState> {
  const denied = await requireAdmin();
  if (denied) return denied;
  const id = formString(formData, "id");
  if (!id) return { error: "Horario no válido." };

  try {
    await prisma.academySchedule.delete({ where: { id } });
  } catch {
    return { error: "No se pudo eliminar el horario." };
  }
  revalidatePath("/admin/academia/cursos");
  return OK;
}

// ---- Inscripciones ----

const academyEnrollmentSchema = z.object({
  studentId: z.string().min(1),
  courseId: z.string().min(1),
  status: z.enum(["ACTIVE", "COMPLETED", "WITHDRAWN"]).default("ACTIVE"),
});

export async function createAcademyEnrollment(_prev: FormState, formData: FormData): Promise<FormState> {
  const denied = await requireAdmin();
  if (denied) return denied;

  const parsed = academyEnrollmentSchema.safeParse({
    studentId: formData.get("studentId"),
    courseId: formData.get("courseId"),
    status: formData.get("status") || "ACTIVE",
  });
  if (!parsed.success) return { error: "Selecciona un alumno y un curso." };

  try {
    await prisma.academyEnrollment.create({
      data: {
        studentId: parsed.data.studentId,
        courseId: parsed.data.courseId,
        status: parsed.data.status as AcademyEnrollmentStatus,
      },
    });
  } catch {
    return { error: "Ese alumno ya está inscrito en este curso de academia." };
  }

  revalidatePath("/admin/academia/inscripciones");
  revalidatePath("/admin/academia/cursos");
  return OK;
}

export async function updateAcademyEnrollmentStatus(formData: FormData): Promise<FormState> {
  const denied = await requireAdmin();
  if (denied) return denied;
  const id = formString(formData, "id");
  const status = formString(formData, "status");
  if (!id || !["ACTIVE", "COMPLETED", "WITHDRAWN"].includes(status)) {
    return { error: "Datos inválidos." };
  }

  try {
    await prisma.academyEnrollment.update({ where: { id }, data: { status } as never });
  } catch {
    return { error: "No se pudo actualizar la inscripción." };
  }
  revalidatePath("/admin/academia/inscripciones");
  revalidatePath("/admin/academia/cursos");
  return OK;
}

export async function deleteAcademyEnrollment(formData: FormData): Promise<FormState> {
  const denied = await requireAdmin();
  if (denied) return denied;
  const id = formString(formData, "id");
  if (!id) return { error: "Inscripción no válida." };

  try {
    await prisma.academyEnrollment.delete({ where: { id } });
  } catch {
    return { error: "No se pudo eliminar la inscripción." };
  }
  revalidatePath("/admin/academia/inscripciones");
  revalidatePath("/admin/academia/cursos");
  return OK;
}

// ---------------------------------------------------------------------------
// Pagos
// ---------------------------------------------------------------------------

const paymentConceptSchema = z.object({
  name: z.string().min(2).max(150),
  description: z.string().max(500).optional().or(z.literal("")),
  amount: z.coerce.number().min(0).optional().or(z.literal("")),
});

export async function createPaymentConcept(_prev: FormState, formData: FormData): Promise<FormState> {
  const denied = await requireAdmin();
  if (denied) return denied;

  const parsed = paymentConceptSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    amount: formData.get("amount") || undefined,
  });
  if (!parsed.success) return { error: "Datos del concepto inválidos." };

  try {
    await prisma.paymentConcept.create({
      data: {
        name: parsed.data.name,
        description: parsed.data.description || null,
        amount: parsed.data.amount === undefined || parsed.data.amount === ""
          ? null
          : new Prisma.Decimal(Number(parsed.data.amount)),
      },
    });
  } catch {
    return { error: "No se pudo crear el concepto (¿ya existe con ese nombre?)." };
  }

  revalidatePath("/admin/pagos/conceptos");
  return OK;
}

export async function togglePaymentConcept(formData: FormData): Promise<FormState> {
  const denied = await requireAdmin();
  if (denied) return denied;
  const id = formString(formData, "id");
  if (!id) return { error: "Concepto no válido." };

  const concept = await prisma.paymentConcept.findUnique({ where: { id }, select: { active: true } });
  if (!concept) return { error: "Concepto no encontrado." };
  try {
    await prisma.paymentConcept.update({ where: { id }, data: { active: !concept.active } });
  } catch {
    return { error: "No se pudo actualizar el concepto." };
  }
  revalidatePath("/admin/pagos/conceptos");
  return OK;
}

export async function deletePaymentConcept(formData: FormData): Promise<FormState> {
  const denied = await requireAdmin();
  if (denied) return denied;
  const id = formString(formData, "id");
  if (!id) return { error: "Concepto no válido." };

  try {
    await prisma.paymentConcept.delete({ where: { id } });
  } catch {
    return { error: "No se pudo eliminar: el concepto tiene pagos registrados." };
  }
  revalidatePath("/admin/pagos/conceptos");
  return OK;
}

const paymentMethodSchema = z.enum(["EFECTIVO", "TARJETA", "TRANSFERENCIA", "DEPOSITO", "YAPE", "PLIN"]);

const paymentSchema = z.object({
  studentId: z.string().min(1),
  academicYearId: z.string().min(1),
  conceptId: z.string().min(1),
  amount: z.coerce.number().gt(0),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida"),
  method: paymentMethodSchema,
  reference: z.string().max(100).optional().or(z.literal("")),
});

async function existingReceiptNumbers(year: number): Promise<string[]> {
  const rows = await prisma.payment.findMany({
    where: { receiptNumber: { startsWith: `B-${year}-` } },
    select: { receiptNumber: true },
  });
  return rows.map((r) => r.receiptNumber);
}

export async function createPayment(_prev: FormState, formData: FormData): Promise<FormState> {
  const denied = await requireAdmin();
  if (denied) return denied;

  const parsed = paymentSchema.safeParse({
    studentId: formData.get("studentId"),
    academicYearId: formData.get("academicYearId"),
    conceptId: formData.get("conceptId"),
    amount: formData.get("amount"),
    date: formData.get("date"),
    method: formData.get("method"),
    reference: formData.get("reference") || undefined,
  });
  if (!parsed.success) return { error: "Datos del pago inválidos. Revisa todos los campos." };

  const academicYear = await prisma.academicYear.findUnique({
    where: { id: parsed.data.academicYearId },
    select: { year: true },
  });
  if (!academicYear) return { error: "Año académico no encontrado." };

  const data = {
    studentId: parsed.data.studentId,
    academicYearId: parsed.data.academicYearId,
    conceptId: parsed.data.conceptId,
    amount: new Prisma.Decimal(parsed.data.amount),
    date: parseDateOnly(parsed.data.date),
    method: parsed.data.method as PaymentMethod,
    reference: parsed.data.reference || null,
  };

  // El número de recibo se calcula a partir del máximo existente por año y se
  // reintenta ante colisiones concurrentes (restricción única receiptNumber).
  for (let attempt = 0; attempt < 5; attempt++) {
    const receiptNumber = buildReceiptNumber(academicYear.year, await existingReceiptNumbers(academicYear.year));
    try {
      await prisma.payment.create({ data: { ...data, receiptNumber } });
      revalidatePath("/admin/pagos");
      return OK;
    } catch (error) {
      if (isUniqueViolation(error) && attempt < 4) continue;
      return { error: "No se pudo registrar el pago." };
    }
  }

  return { error: "No se pudo registrar el pago. Intenta nuevamente." };
}

export async function deletePayment(formData: FormData): Promise<FormState> {
  const denied = await requireAdmin();
  if (denied) return denied;
  const id = formString(formData, "id");
  if (!id) return { error: "Pago no válido." };

  try {
    await prisma.payment.delete({ where: { id } });
  } catch {
    return { error: "No se pudo anular el pago." };
  }
  revalidatePath("/admin/pagos");
  return OK;
}

// ---------------------------------------------------------------------------
// Configuración de la institución
// ---------------------------------------------------------------------------

const schoolSchema = z.object({
  name: z.string().min(3).max(200),
  shortName: z.string().min(2).max(100),
  slogan: z.string().max(200).optional().or(z.literal("")),
  ruc: z.string().max(20).optional().or(z.literal("")),
  address: z.string().max(200).optional().or(z.literal("")),
  phone: z.string().max(40).optional().or(z.literal("")),
  email: z.string().email().optional().or(z.literal("")),
  website: z.string().max(120).optional().or(z.literal("")),
  directorName: z.string().max(150).optional().or(z.literal("")),
  directorDocument: z.string().max(20).optional().or(z.literal("")),
  primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Color inválido"),
});

export async function updateSchoolSettings(_prev: FormState, formData: FormData): Promise<FormState> {
  const denied = await requireAdmin();
  if (denied) return denied;

  const parsed = schoolSchema.safeParse({
    name: formData.get("name"),
    shortName: formData.get("shortName"),
    slogan: formData.get("slogan") || undefined,
    ruc: formData.get("ruc") || undefined,
    address: formData.get("address") || undefined,
    phone: formData.get("phone") || undefined,
    email: formData.get("email") || undefined,
    website: formData.get("website") || undefined,
    directorName: formData.get("directorName") || undefined,
    directorDocument: formData.get("directorDocument") || undefined,
    primaryColor: formData.get("primaryColor") || "#0f766e",
  });
  if (!parsed.success) return { error: "Datos inválidos. Revisa el correo y el color (hex #RRGGBB)." };

  const data = {
    name: parsed.data.name,
    shortName: parsed.data.shortName,
    slogan: parsed.data.slogan || null,
    ruc: parsed.data.ruc || null,
    address: parsed.data.address || null,
    phone: parsed.data.phone || null,
    email: parsed.data.email || null,
    website: parsed.data.website || null,
    directorName: parsed.data.directorName || null,
    directorDocument: parsed.data.directorDocument || null,
    primaryColor: parsed.data.primaryColor,
  };

  let logoUrl: string | null | undefined;
  const file = formData.get("logoFile");
  if (file instanceof File && file.size > 0) {
    if (file.size > 800_000) return { error: "El logo no debe superar 800 KB." };
    if (!file.type.startsWith("image/")) return { error: "El logo debe ser una imagen (PNG/JPG/SVG)." };
    const buffer = Buffer.from(await file.arrayBuffer());
    logoUrl = `data:${file.type};base64,${buffer.toString("base64")}`;
  } else if (formData.get("removeLogo")) {
    logoUrl = null;
  }

  try {
    await prisma.schoolSettings.upsert({
      where: { id: "default" },
      update: logoUrl === undefined ? data : { ...data, logoUrl },
      create: { id: "default", ...data, logoUrl: logoUrl ?? null },
    });
  } catch {
    return { error: "No se pudo guardar la configuración." };
  }

  revalidatePath("/admin/configuracion");
  revalidatePath("/admin");
  revalidatePath("/portal");
  return { success: "Configuración guardada." };
}