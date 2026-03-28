import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { uploadFile } from "@/lib/storage";

const MAX_SIZE = 20 * 1024 * 1024; // 20 MB

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const files = await prisma.taskFile.findMany({
    where: { taskId: id },
    include: { uploadedBy: { select: { id: true, name: true } } },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(files);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const userId = (session.user as any).id;

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
}
