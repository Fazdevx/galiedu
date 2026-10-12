import { pdf } from "@react-pdf/renderer";
import { BoletaDocument } from "@/lib/pdf/documents";
import { buildBoletaData } from "@/lib/pdf/build";
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
  const data = await buildBoletaData(id);
  if (!data) return new Response("Boleta no encontrada", { status: 404 });

  const school = await getSchoolSettings();
  const blob = await pdf(<BoletaDocument data={data} school={school} />).toBlob();

  return new Response(blob, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="boleta-${data.receiptNumber}.pdf"`,
    },
  });
}