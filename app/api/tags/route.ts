import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { withErrorHandling, parseBody, unauthorized } from "@/lib/api-handler";
import { tagCreateSchema } from "@/lib/validation";

export const GET = withErrorHandling(async () => {
  const session = await getServerSession(authOptions);
  if (!session) throw unauthorized();

  const tags = await prisma.tag.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json(tags);
});

export const POST = withErrorHandling(async (req: NextRequest) => {
  const session = await getServerSession(authOptions);
  if (!session) throw unauthorized();

  const { name, color } = await parseBody(req, tagCreateSchema);
  const tag = await prisma.tag.create({ data: { name, color: color ?? "#6b7280" } });
  return NextResponse.json(tag, { status: 201 });
});
