import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const items = await prisma.serviceCatalog.findMany({
    where: { isActive: true },
    orderBy: [{ name: "asc" }],
    include: { catalogCategory: { select: { id: true, name: true, parentId: true } } },
  });

  return NextResponse.json(items);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as any).role;
  if (role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const data = await req.json();
  const item = await prisma.serviceCatalog.create({ data });
  return NextResponse.json(item, { status: 201 });
}
