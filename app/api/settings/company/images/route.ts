import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { uploadFile } from "@/lib/storage";
import { withErrorHandling, unauthorized, forbidden, badRequest } from "@/lib/api-handler";

const MAX_SIZE = 5 * 1024 * 1024;

export const POST = withErrorHandling(async (req: NextRequest) => {
  const session = await getServerSession(authOptions);
  if (!session) throw unauthorized();

  const role = session.user.role;
  if (role !== "ADMIN") throw forbidden();

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const type = formData.get("type") as string | null; // "stamp" | "signature"

  if (!file) throw badRequest("Файл не передан");
  if (!["stamp", "signature", "logo"].includes(type ?? "")) {
    throw badRequest("Неверный тип");
  }
  if (file.size > MAX_SIZE) throw badRequest("Файл слишком большой (макс. 5 МБ)");

  const buffer = Buffer.from(await file.arrayBuffer());
  const { key } = await uploadFile(buffer, file.name, file.type || "image/png", "company");

  const field = type === "stamp" ? "stampImage" : type === "logo" ? "logoImage" : "signatureImage";

  const settings = await prisma.companySettings.upsert({
    where: { id: "singleton" },
    update: { [field]: key },
    create: { id: "singleton", [field]: key },
  });

  return NextResponse.json({ path: key, settings });
});
