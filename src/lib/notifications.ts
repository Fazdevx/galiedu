import { prisma } from "@/lib/prisma";
import { sendMail } from "@/lib/mailer";
import { formatDate } from "@/lib/date";

/**
 * Envía por correo el recibo de un pago al apoderado del alumno.
 * Es "best effort": si no hay correo o falla el envío, no interrumpe el registro.
 */
export async function sendPaymentReceipt(paymentId: string): Promise<void> {
  try {
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      select: {
        receiptNumber: true,
        amount: true,
        date: true,
        method: true,
        student: {
          select: {
            firstName: true,
            lastName: true,
            guardianEmail: true,
            guardianUser: { select: { email: true } },
          },
        },
        concept: { select: { name: true } },
      },
    });
    if (!payment) return;

    const email = payment.student.guardianEmail || payment.student.guardianUser?.email;
    if (!email) return;

    const amount = new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" }).format(
      Number(payment.amount),
    );
    const student = `${payment.student.firstName} ${payment.student.lastName}`;
    const dateText = formatDate(payment.date);

    await sendMail({
      to: email,
      subject: `Recibo ${payment.receiptNumber} · Galileo EDU`,
      text: `Pago registrado. Recibo ${payment.receiptNumber}. Alumno: ${student}. Concepto: ${payment.concept.name}. Monto: ${amount}. Fecha: ${dateText}.`,
      html: `<p>Hemos registrado un pago:</p>
<ul>
  <li><strong>Recibo:</strong> ${payment.receiptNumber}</li>
  <li><strong>Alumno:</strong> ${student}</li>
  <li><strong>Concepto:</strong> ${payment.concept.name}</li>
  <li><strong>Monto:</strong> ${amount}</li>
  <li><strong>Fecha:</strong> ${dateText}</li>
</ul>`,
    });
  } catch {
    // Best effort: no interrumpir el flujo principal.
  }
}
