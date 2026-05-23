import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { withErrorHandling, parseBody, unauthorized, forbidden } from "@/lib/api-handler";
import { taskColumnCreateSchema } from "@/lib/validation";

export const GET = withErrorHandling(async () => {
  const session = await getServerSession(authOptions);
  if (!session) throw unauthorized();

  const columns = await prisma.taskColumn.findMany({
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
  });
  return NextResponse.json(columns);
});

export const POST = withErrorHandling(async (req: NextRequest) => {
  const session = await getServerSession(authOptions);
  if (!session) throw unauthorized();

  const role = session.user.role;
  if (role !== "ADMIN") throw forbidden();

  const { name, color } = await parseBody(req, taskColumnCreateSchema);

  const last = await prisma.taskColumn.findFirst({ orderBy: { order: "desc" } });
  const key = `col_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

  const column = await prisma.taskColumn.create({
    data: {
      key,
      name,
      color: color || "#94a3b8",
      order: (last?.order ?? -1) + 1,
      isSystem: false,
    },
  });
  return NextResponse.json(column, { status: 201 });
});
