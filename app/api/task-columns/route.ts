import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const columns = await prisma.taskColumn.findMany({
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
  });
  return NextResponse.json(columns);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as any).role;
  if (role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const data = await req.json();
  const name = String(data.name ?? "").trim();
  if (!name) return NextResponse.json({ error: "Имя обязательно" }, { status: 400 });

  const last = await prisma.taskColumn.findFirst({ orderBy: { order: "desc" } });
  const key = `col_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

  const column = await prisma.taskColumn.create({
    data: {
      key,
      name,
      color: data.color || "#94a3b8",
      order: (last?.order ?? -1) + 1,
      isSystem: false,
    },
  });
  return NextResponse.json(column, { status: 201 });
}
