import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const settings = await prisma.companySettings.findUnique({ where: { id: "singleton" } });
  return NextResponse.json(settings ?? { id: "singleton" });
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as any).role;
  if (role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const data = await req.json();
  const { id: _id, updatedAt: _u, ...fields } = data;

  const settings = await prisma.companySettings.upsert({
    where: { id: "singleton" },
    update: fields,
    create: { id: "singleton", ...fields },
  });

  return NextResponse.json(settings);
}
