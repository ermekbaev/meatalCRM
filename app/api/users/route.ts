import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hash } from "bcryptjs";

export async function GET(_: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as any).role;

  // Non-admins can read the list (needed for assignee dropdowns) but get limited fields
  if (role !== "ADMIN") {
    const users = await prisma.user.findMany({
      where: { isBlocked: false },
      select: { id: true, name: true, role: true },
      orderBy: { name: "asc" },
    });
    return NextResponse.json(users);
  }

  const users = await prisma.user.findMany({
    select: { id: true, email: true, name: true, role: true, isBlocked: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(users);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as any).role;
  if (role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { email, password, name, role: userRole } = await req.json();
  const hashed = await hash(password, 12);

  const user = await prisma.user.create({
    data: { email, password: hashed, name, role: userRole },
    select: { id: true, email: true, name: true, role: true, isBlocked: true, createdAt: true },
  });

  return NextResponse.json(user, { status: 201 });
}
