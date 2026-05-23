import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hash } from "bcryptjs";
import { withErrorHandling, parseBody, unauthorized, forbidden } from "@/lib/api-handler";
import { userUpdateSchema } from "@/lib/validation";

export const PUT = withErrorHandling(async (req: NextRequest, { params }) => {
  const session = await getServerSession(authOptions);
  if (!session) throw unauthorized();

  const role = session.user.role;
  if (role !== "ADMIN") throw forbidden();

  const { id } = await params;
  const { password, ...data } = await parseBody(req, userUpdateSchema);
  const updateData: typeof data & { password?: string } = { ...data };
  if (password) updateData.password = await hash(password, 12);

  const user = await prisma.user.update({
    where: { id },
    data: updateData,
    select: { id: true, email: true, name: true, role: true, isBlocked: true, phone: true, position: true, createdAt: true },
  });

  return NextResponse.json(user);
});

export const DELETE = withErrorHandling(async (_req: NextRequest, { params }) => {
  const session = await getServerSession(authOptions);
  if (!session) throw unauthorized();

  const role = session.user.role;
  if (role !== "ADMIN") throw forbidden();

  const { id } = await params;
  await prisma.user.delete({ where: { id } });
  return NextResponse.json({ ok: true });
});
