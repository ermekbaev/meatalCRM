import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { withErrorHandling, parseBody, unauthorized, notFound } from "@/lib/api-handler";
import { getPortalRequestAccess } from "@/lib/acl";
import { z } from "zod";

const schema = z.object({ name: z.string().trim().min(1).max(500) });

export const POST = withErrorHandling(async (req: NextRequest, { params }) => {
  const session = await getServerSession(authOptions);
  if (!session) throw unauthorized();

  const { id, catId } = await params;
  const access = await getPortalRequestAccess(session, id);
  if (!access) throw notFound();

  const cat = await prisma.portalRequestSubtaskCategory.findFirst({
    where: { id: catId, portalRequestId: id },
    select: { id: true },
  });
  if (!cat) throw notFound();

  const data = await parseBody(req, schema);
  const last = await prisma.portalRequestSubtask.findFirst({
    where: { categoryId: catId },
    orderBy: { order: "desc" },
    select: { order: true },
  });

  const subtask = await prisma.portalRequestSubtask.create({
    data: { categoryId: catId, name: data.name, order: (last?.order ?? 0) + 1 },
  });
  return NextResponse.json(subtask, { status: 201 });
});
