import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { withErrorHandling, unauthorized } from "@/lib/api-handler";

function getPeriodStart(period: string): Date | null {
  const now = new Date();
  if (period === "week")    { const d = new Date(now); d.setDate(d.getDate() - 7);   return d; }
  if (period === "month")   { const d = new Date(now); d.setMonth(d.getMonth() - 1); return d; }
  if (period === "quarter") { const d = new Date(now); d.setMonth(d.getMonth() - 3); return d; }
  if (period === "year")    { const d = new Date(now); d.setFullYear(d.getFullYear() - 1); return d; }
  return null;
}

export const GET = withErrorHandling(async (req: NextRequest) => {
  const session = await getServerSession(authOptions);
  if (!session) throw unauthorized();

  const period = new URL(req.url).searchParams.get("period") ?? "month";
  const since = getPeriodStart(period);

  const requests = await prisma.request.findMany({
    where: {
      status: "COMPLETED",
      amount: { gt: 0 },
      ...(since && { createdAt: { gte: since } }),
    },
    include: { client: { select: { name: true } } },
    orderBy: { updatedAt: "desc" },
    take: 50,
  });

  return NextResponse.json(requests);
});
