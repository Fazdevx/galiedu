import { pdf } from "@react-pdf/renderer";
import { BoletínDocument } from "@/lib/pdf/documents";
import { buildBoletinData } from "@/lib/pdf/build";
import { getPdfSchoolInfo } from "@/lib/settings";
import { auth } from "@/auth";
import { isStaff } from "@/lib/roles";

export const runtime = "nodejs";

export async function GET(req: Request, { params }: { params: Promise<{ studentId: string }> }) {
  const session = await auth();
  if (!session?.user?.role || !isStaff(session.user.role)) {
    return new Response("No autorizado", { status: 401 });
  }

  const { studentId } = await params;
  const yearId = new URL(req.url).searchParams.get("year");
  if (!yearId) return new Response("Indica el año académico (?year=)", { status: 400 });

  const data = await buildBoletinData(studentId, yearId);
  if (!data) return new Response("No se pudo generar el boletín (sin matrícula o datos).", { status: 404 });

  const school = await getPdfSchoolInfo();
  const blob = await pdf(<BoletínDocument data={data} school={school} />).toBlob();

  return new Response(blob, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="boletin-${studentId}.pdf"`,
    },
  });
}