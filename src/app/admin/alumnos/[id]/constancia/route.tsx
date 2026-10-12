import { pdf } from "@react-pdf/renderer";
import { ConstanciaDocument } from "@/lib/pdf/documents";
import { buildConstanciaData } from "@/lib/pdf/build";
import { getSchoolSettings } from "@/lib/settings";
import { auth } from "@/auth";
import { isStaff } from "@/lib/roles";

export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.role || !isStaff(session.user.role)) {
    return new Response("No autorizado", { status: 401 });
  }

  const { id } = await params;
  const data = await buildConstanciaData(id);
  if (!data) {
    return new Response("El estudiante no tiene matrícula vigente en el año activo", { status: 404 });
  }

  const school = await getSchoolSettings();
  const blob = await pdf(<ConstanciaDocument data={data} school={school} />).toBlob();

  return new Response(blob, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="constancia-${id}.pdf"`,
    },
  });
}