import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const items = await prisma.metalCatalogEntry.findMany({
    orderBy: [{ materialId: "asc" }, { thickness: "asc" }, { width: "asc" }],
  });
  return NextResponse.json(items);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if ((session.user as any).role !== "ADMIN")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const data = await req.json();
  const { materialId, thickness, width, length, massPerSqM, sheetMass } = data;
  const item = await prisma.metalCatalogEntry.upsert({
    where: { materialId_thickness_width_length: { materialId, thickness, width, length } },
    update: { massPerSqM, sheetMass },
    create: { materialId, thickness, width, length, massPerSqM, sheetMass },
  });
  return NextResponse.json(item, { status: 201 });
}
