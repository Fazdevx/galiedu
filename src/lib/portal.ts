import { prisma } from "@/lib/prisma";

// Alumnos visibles para un apoderado (o el propio alumno)
export async function getPortalStudents(userId: string) {
  return prisma.student.findMany({
    where: { OR: [{ guardianUserId: userId }, { userId }] },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    include: {
      enrollments: {
        where: { academicYear: { isActive: true } },
        include: { section: { include: { grade: { include: { level: true } } } }, academicYear: true },
        take: 1,
      },
    },
  });
}

// Verifica que el usuario pueda acceder a la ficha de un alumno
export async function canAccessStudent(userId: string, studentId: string): Promise<boolean> {
  const found = await prisma.student.findFirst({
    where: { id: studentId, OR: [{ guardianUserId: userId }, { userId }] },
    select: { id: true },
  });
  return !!found;
}

// Verifica que el usuario pueda acceder a una boleta de pago
export async function canAccessPayment(userId: string, paymentId: string): Promise<boolean> {
  const found = await prisma.payment.findFirst({
    where: {
      id: paymentId,
      student: { OR: [{ guardianUserId: userId }, { userId }] },
    },
    select: { id: true },
  });
  return !!found;
}
