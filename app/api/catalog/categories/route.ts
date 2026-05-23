import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { withErrorHandling, parseBody, unauthorized, forbidden } from "@/lib/api-handler";
import { catalogCategoryCreateSchema } from "@/lib/validation";

export const GET = withErrorHandling(async (req: NextRequest) => {
  const session = await getServerSession(authOptions);
  if (!session) throw unauthorized();

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
});

export const POST = withErrorHandling(async (req: NextRequest) => {
  const session = await getServerSession(authOptions);
  if (!session) throw unauthorized();

  const role = session.user.role;
  if (role !== "ADMIN" && role !== "MANAGER") throw forbidden();

  const { name, parentId, type } = await parseBody(req, catalogCategoryCreateSchema);

  const category = await prisma.catalogCategory.create({
    data: { name, parentId: parentId ?? null, type },
  });

  return NextResponse.json(category, { status: 201 });
});
