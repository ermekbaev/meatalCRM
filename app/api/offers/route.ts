import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") ?? "";
  const status = searchParams.get("status") ?? "";

  const offers = await prisma.commercialOffer.findMany({
    where: {
      AND: [
        search ? { request: { title: { contains: search, mode: "insensitive" } } } : {},
        status ? { status: status as any } : {},
      ],
    },
    include: {
      request: { include: { client: true } },
      createdBy: { select: { id: true, name: true } },
      items: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(offers);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as any).id;
  const { items, ...data } = await req.json();

  const offer = await prisma.commercialOffer.create({
    data: {
      ...data,
      createdById: userId,
      items: { create: items },
    },
    include: { items: true, request: { include: { client: true } }, createdBy: true },
  });

  return NextResponse.json(offer, { status: 201 });
}
