import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const type = new URL(req.url).searchParams.get("type") ?? "service";

  const categories = await prisma.catalogCategory.findMany({
    where: { type },
    orderBy: [{ order: "asc" }, { name: "asc" }],
    include: {
      children: {
        where: { type },
        orderBy: [{ order: "asc" }, { name: "asc" }],
        include: { _count: { select: { items: true } } },
      },
      _count: { select: { items: true } },
    },
  });

  return NextResponse.json(categories.filter((c) => c.parentId === null));
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as any).role;
  if (role !== "ADMIN" && role !== "MANAGER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { name, parentId, type } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: "Название обязательно" }, { status: 400 });

  const category = await prisma.catalogCategory.create({
    data: { name: name.trim(), parentId: parentId ?? null, type: type ?? "service" },
  });

  return NextResponse.json(category, { status: 201 });
}
