import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { withErrorHandling, parseBody, unauthorized, forbidden } from "@/lib/api-handler";
import { checklistCreateSchema } from "@/lib/validation";

export const POST = withErrorHandling(async (req: NextRequest, { params }) => {
  const session = await getServerSession(authOptions);
  if (!session) throw unauthorized();
  if (session.user.role === "CONTRACTOR") throw forbidden();

  const { id } = await params;
  const { text } = await parseBody(req, checklistCreateSchema);

  const count = await prisma.checklistItem.count({ where: { taskId: id } });

  const item = await prisma.checklistItem.create({
    data: { taskId: id, text, order: count },
  });

  return NextResponse.json(item, { status: 201 });
});
