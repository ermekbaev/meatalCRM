import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PortalRequestsList } from "./PortalRequestsList";

export default async function PortalIndexPage() {
  const session = await getServerSession(authOptions);
  // Слои защиты уже отработали в layout — здесь просто страхуемся для TS.
  if (!session?.user.companyId) redirect("/login");

  const requests = await prisma.portalRequest.findMany({
    where: { companyId: session.user.companyId },
    select: {
      id: true,
      number: true,
      title: true,
      status: true,
      paymentStatus: true,
      shippedAt: true,
      acceptedAt: true,
      createdAt: true,
      _count: { select: { items: true, comments: true, files: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  // Контейнер на всю ширину — клиенты с большим списком заявок жаловались
  // на узкую центральную колонку. Внутренний padding оставляем для воздуха.
  return (
    <div className="p-4 lg:p-6">
      <PortalRequestsList requests={requests} />
    </div>
  );
}
