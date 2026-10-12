import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const settings = await prisma.schoolSettings
    .findUnique({
      where: { id: "default" },
      select: { logoData: true, logoMime: true },
    })
    .catch(() => null);

  if (!settings?.logoData || !settings.logoMime) {
    return new NextResponse(null, { status: 404 });
  }

  return new NextResponse(new Uint8Array(settings.logoData), {
    headers: {
      "Content-Type": settings.logoMime,
      "Cache-Control": "public, max-age=86400, immutable",
    },
  });
}
