import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { uploadFile } from "@/lib/storage";

const MAX_SIZE = 5 * 1024 * 1024;

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as any).role;
  if (role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const type = formData.get("type") as string | null; // "stamp" | "signature"

  if (!file) return NextResponse.json({ error: "Файл не передан" }, { status: 400 });
  if (!["stamp", "signature"].includes(type ?? "")) {
    return NextResponse.json({ error: "Неверный тип" }, { status: 400 });
  }
  if (file.size > MAX_SIZE) return NextResponse.json({ error: "Файл слишком большой (макс. 5 МБ)" }, { status: 400 });

  const buffer = Buffer.from(await file.arrayBuffer());
  const { key } = await uploadFile(buffer, file.name, file.type || "image/png", "company");

  const field = type === "stamp" ? "stampImage" : "signatureImage";

  const settings = await prisma.companySettings.upsert({
    where: { id: "singleton" },
    update: { [field]: key },
    create: { id: "singleton", [field]: key },
  });

  return NextResponse.json({ path: key, settings });
}
