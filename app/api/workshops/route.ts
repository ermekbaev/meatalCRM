import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as any).role;
  const userId = (session.user as any).id;

  const workshops = await prisma.workshop.findMany({
    where: role === "ADMIN" || role === "MANAGER"
      ? {}
      : { members: { some: { id: userId } } },
    include: {
      members: {
        select: { id: true, name: true, role: true, position: true },
        orderBy: { name: "asc" },
      },
      _count: { select: { tasks: true } },
    },
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
  });

  return NextResponse.json(workshops);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as any).role;
  if (role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const data = await req.json();
  const name = String(data.name ?? "").trim();
  if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });

  const memberIds = Array.isArray(data.memberIds) ? data.memberIds.filter(Boolean) : [];

  const workshop = await prisma.workshop.create({
    data: {
      name,
      order: Number.isFinite(Number(data.order)) ? Number(data.order) : 0,
      members: memberIds.length
        ? { connect: memberIds.map((id: string) => ({ id })) }
        : undefined,
    },
    include: {
      members: {
        select: { id: true, name: true, role: true, position: true },
        orderBy: { name: "asc" },
      },
      _count: { select: { tasks: true } },
    },
  });

  return NextResponse.json(workshop, { status: 201 });
}
