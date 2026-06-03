import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import type { ClientType } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { withErrorHandling, parseBody, unauthorized, forbidden } from "@/lib/api-handler";
import { getPageParams, paginated } from "@/lib/pagination";
import { clientCreateSchema } from "@/lib/validation";

export const GET = withErrorHandling(async (req: NextRequest) => {
  const session = await getServerSession(authOptions);
  if (!session) throw unauthorized();

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") ?? "";
  const type = searchParams.get("type") ?? "";
  const pp = getPageParams(searchParams);

  const where = {
    AND: [
      search ? {
        OR: [
          { name: { contains: search, mode: "insensitive" as const } },
          { phone: { contains: search, mode: "insensitive" as const } },
          { email: { contains: search, mode: "insensitive" as const } },
          { inn: { contains: search, mode: "insensitive" as const } },
        ],
      } : {},
      type ? { type: type as ClientType } : {},
    ],
  };

  const [items, total] = await Promise.all([
    prisma.client.findMany({
      where,
      include: { _count: { select: { requests: true } } },
      orderBy: { createdAt: "desc" },
      skip: pp.skip,
      take: pp.take,
    }),
    prisma.client.count({ where }),
  ]);

  return NextResponse.json(paginated(items, total, pp));
});

export const POST = withErrorHandling(async (req: NextRequest) => {
  const session = await getServerSession(authOptions);
  if (!session) throw unauthorized();
  if (session.user.role !== "ADMIN" && session.user.role !== "MANAGER") throw forbidden();

  const data = await parseBody(req, clientCreateSchema);
  const client = await prisma.client.create({ data });
  return NextResponse.json(client, { status: 201 });
});
