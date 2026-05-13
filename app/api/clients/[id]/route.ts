import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const client = await prisma.client.findUnique({
    where: { id },
    include: {
      requests: {
        orderBy: { createdAt: "desc" },
        include: { assignee: true },
      },
    },
  });

  if (!client) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(client);
}

const CLIENT_UPDATE_FIELDS = [
  "type", "name", "phone", "email", "inn", "comment",
  "shortName", "source", "website", "director", "legalAddress", "postalAddress",
  "ogrn", "kpp", "bankName", "bankAccount", "bankBik", "bankCorAccount",
] as const;

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const data: Record<string, unknown> = {};
  for (const key of CLIENT_UPDATE_FIELDS) {
    if (key in body) data[key] = body[key];
  }
  const client = await prisma.client.update({ where: { id }, data });
  return NextResponse.json(client);
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as any).role;
  if (role !== "ADMIN" && role !== "MANAGER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  await prisma.client.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
