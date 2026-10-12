import { pdf } from "@react-pdf/renderer";
import { BoletínDocument } from "@/lib/pdf/documents";
import { buildBoletinData } from "@/lib/pdf/build";
import { getPdfSchoolInfo } from "@/lib/settings";
import { auth } from "@/auth";
import { canAccessStudent } from "@/lib/portal";

export const runtime = "nodejs";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return new Response("No autorizado", { status: 401 });

  const { id } = await params;
  if (!(await canAccessStudent(session.user.id, id))) {
    return new Response("No autorizado", { status: 403 });
  }

  const yearId = new URL(req.url).searchParams.get("year");
  if (!yearId) return new Response("Indica el año académico (?year=)", { status: 400 });

  const data = await buildBoletinData(id, yearId);
  if (!data) return new Response("No se pudo generar el boletín.", { status: 404 });

  const school = await getPdfSchoolInfo();
  const blob = await pdf(<BoletínDocument data={data} school={school} />).toBlob();

  return new Response(blob, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="boletin-${id}.pdf"`,
    },
  });
}