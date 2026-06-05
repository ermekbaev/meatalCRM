import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { withErrorHandling, parseBody, unauthorized, forbidden, notFound } from "@/lib/api-handler";
import { z } from "zod";

const schema = z.object({ name: z.string().trim().min(1).max(200) });

async function checkAccess(requestId: string, session: NonNullable<Awaited<ReturnType<typeof getServerSession<typeof authOptions>>>>) {
  const role = session.user.role;
  if (role !== "ADMIN" && role !== "MANAGER") return null;
  const req = await prisma.request.findFirst({
    where: { id: requestId },
    select: { id: true, lockedAt: true },
  });
  return req;
}

export const POST = withErrorHandling(async (req: NextRequest, { params }) => {
  const session = await getServerSession(authOptions);
  if (!session) throw unauthorized();

  const { id } = await params;
  const request = await checkAccess(id, session);
  if (!request) throw notFound();
  if (session.user.role === "MANAGER" && request.lockedAt) {
    throw forbidden("Заявка заблокирована.");
  }

  const data = await parseBody(req, schema);
  const last = await prisma.requestSubtaskCategory.findFirst({
    where: { requestId: id },
    orderBy: { order: "desc" },
    select: { order: true },
  });

  const category = await prisma.requestSubtaskCategory.create({
    data: { requestId: id, name: data.name, order: (last?.order ?? 0) + 1 },
    include: { subtasks: true },
  });
  return NextResponse.json(category, { status: 201 });
});
