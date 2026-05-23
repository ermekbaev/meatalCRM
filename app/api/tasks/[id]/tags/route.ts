import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { withErrorHandling, parseBody, unauthorized, forbidden } from "@/lib/api-handler";
import { taskTagSchema } from "@/lib/validation";

// POST — добавить тег к задаче, DELETE — убрать тег
export const POST = withErrorHandling(async (req: NextRequest, { params }) => {
  const session = await getServerSession(authOptions);
  if (!session) throw unauthorized();
  if (session.user.role === "CONTRACTOR") throw forbidden();

  const { id } = await params;
  const { tagId } = await parseBody(req, taskTagSchema);

  await prisma.task.update({
    where: { id },
    data: { tags: { connect: { id: tagId } } },
  });

  return NextResponse.json({ ok: true });
});

export const DELETE = withErrorHandling(async (req: NextRequest, { params }) => {
  const session = await getServerSession(authOptions);
  if (!session) throw unauthorized();
  if (session.user.role === "CONTRACTOR") throw forbidden();

  const { id } = await params;
  const { tagId } = await parseBody(req, taskTagSchema);

  await prisma.task.update({
    where: { id },
    data: { tags: { disconnect: { id: tagId } } },
  });

  return NextResponse.json({ ok: true });
});
