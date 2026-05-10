import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hash } from "bcryptjs";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as any).role;
  const { searchParams } = new URL(req.url);
  const roleFilter = searchParams.getAll("role").filter(Boolean);
  const workshopId = searchParams.get("workshopId") || undefined;

  // Non-admins can read the list (needed for assignee dropdowns) but get limited fields
  if (role !== "ADMIN") {
    const users = await prisma.user.findMany({
      where: {
        isBlocked: false,
        ...(roleFilter.length ? { role: { in: roleFilter as any } } : {}),
        ...(workshopId ? { workshops: { some: { id: workshopId } } } : {}),
      },
      select: { id: true, name: true, role: true, position: true },
      orderBy: { name: "asc" },
    });
    return NextResponse.json(users);
  }

  const users = await prisma.user.findMany({
    where: {
      ...(roleFilter.length ? { role: { in: roleFilter as any } } : {}),
      ...(workshopId ? { workshops: { some: { id: workshopId } } } : {}),
    },
    select: { id: true, email: true, name: true, role: true, isBlocked: true, telegramChatId: true, phone: true, position: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(users);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as any).role;
  if (role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { email, password, name, role: userRole, telegramChatId, phone, position } = await req.json();
  const hashed = await hash(password, 12);

  const user = await prisma.user.create({
    data: { email, password: hashed, name, role: userRole, telegramChatId: telegramChatId || null, phone: phone || null, position: position || null },
    select: { id: true, email: true, name: true, role: true, isBlocked: true, telegramChatId: true, phone: true, position: true, createdAt: true },
  });

  return NextResponse.json(user, { status: 201 });
}
