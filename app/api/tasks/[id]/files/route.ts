import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { uploadFile } from "@/lib/storage";
import { withErrorHandling, unauthorized, forbidden } from "@/lib/api-handler";

const MAX_SIZE = 20 * 1024 * 1024; // 20 MB

export const GET = withErrorHandling(async (_req: NextRequest, { params }) => {
  const session = await getServerSession(authOptions);
  if (!session) throw unauthorized();

  const { id } = await params;
  const files = await prisma.taskFile.findMany({
    where: { taskId: id },
    include: { uploadedBy: { select: { id: true, name: true } } },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(files);
});

export const POST = withErrorHandling(async (req: NextRequest, { params }) => {
  const session = await getServerSession(authOptions);
  if (!session) throw unauthorized();
  if (session.user.role === "CONTRACTOR") throw forbidden();

  const { id } = await params;
  const userId = session.user.id;

  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) return NextResponse.json({ error: "Файл не передан" }, { status: 400 });
  if (file.size > MAX_SIZE) return NextResponse.json({ error: "Файл слишком большой (макс. 20 МБ)" }, { status: 400 });

  const buffer = Buffer.from(await file.arrayBuffer());
  const { key } = await uploadFile(buffer, file.name, file.type, "tasks");

  const record = await prisma.taskFile.create({
    data: {
      filename: key,
      originalName: file.name,
      size: file.size,
      mimeType: file.type || null,
      taskId: id,
      uploadedById: userId,
    },
    include: { uploadedBy: { select: { id: true, name: true } } },
  });

  return NextResponse.json(record, { status: 201 });
});
