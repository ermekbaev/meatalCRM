import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { withErrorHandling, parseBody, unauthorized, forbidden, notFound } from "@/lib/api-handler";
import { z } from "zod";

const schema = z.object({ name: z.string().trim().min(1).max(500) });

export const POST = withErrorHandling(async (req: NextRequest, { params }) => {
  const session = await getServerSession(authOptions);
  if (!session) throw unauthorized();

  const role = session.user.role;
  if (role !== "ADMIN" && role !== "MANAGER") throw forbidden();

  const { id, catId } = await params;
  const cat = await prisma.requestSubtaskCategory.findFirst({
    where: { id: catId, requestId: id },
    select: { id: true, request: { select: { lockedAt: true } } },
  });
  if (!cat) throw notFound();
  if (role === "MANAGER" && cat.request.lockedAt) throw forbidden("Заявка заблокирована.");

  const data = await parseBody(req, schema);
  const last = await prisma.requestSubtask.findFirst({
    where: { categoryId: catId },
    orderBy: { order: "desc" },
    select: { order: true },
  });

  const subtask = await prisma.requestSubtask.create({
    data: { categoryId: catId, name: data.name, order: (last?.order ?? 0) + 1 },
  });
  return NextResponse.json(subtask, { status: 201 });
});
