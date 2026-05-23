import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { withErrorHandling, parseBody, unauthorized, forbidden } from "@/lib/api-handler";
import { companySettingsSchema } from "@/lib/validation";

export const GET = withErrorHandling(async () => {
  const session = await getServerSession(authOptions);
  if (!session) throw unauthorized();

  const settings = await prisma.companySettings.findUnique({ where: { id: "singleton" } });
  return NextResponse.json(settings ?? { id: "singleton" });
});

export const PUT = withErrorHandling(async (req: NextRequest) => {
  const session = await getServerSession(authOptions);
  if (!session) throw unauthorized();

  const role = session.user.role;
  if (role !== "ADMIN") throw forbidden();

  const fields = await parseBody(req, companySettingsSchema);

  const settings = await prisma.companySettings.upsert({
    where: { id: "singleton" },
    update: fields,
    create: { id: "singleton", ...fields },
  });

  return NextResponse.json(settings);
});
