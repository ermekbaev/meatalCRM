import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { withErrorHandling, parseBody, unauthorized, forbidden } from "@/lib/api-handler";
import { checklistUpdateSchema } from "@/lib/validation";

export const PUT = withErrorHandling(async (req: NextRequest, { params }) => {
  const session = await getServerSession(authOptions);
  if (!session) throw unauthorized();
  if (session.user.role === "CONTRACTOR") throw forbidden();

  const { itemId } = await params;
  const body = await parseBody(req, checklistUpdateSchema);

  const item = await prisma.checklistItem.update({
    where: { id: itemId },
    data: {
      ...(body.text !== undefined && { text: body.text }),
      ...(body.isCompleted !== undefined && { isCompleted: body.isCompleted }),
    },
  });

  return NextResponse.json(item);
});

export const DELETE = withErrorHandling(async (_req: NextRequest, { params }) => {
  const session = await getServerSession(authOptions);
  if (!session) throw unauthorized();
  if (session.user.role === "CONTRACTOR") throw forbidden();

  const { itemId } = await params;
  await prisma.checklistItem.delete({ where: { id: itemId } });
  return NextResponse.json({ ok: true });
});
