import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ClientsView, PAGE_SIZE } from "./ClientsView";

/**
 * Server component для списка контрагентов.
 *
 * Грузит первую страницу через prisma (минуя API-роут) и отдаёт её клиентской
 * вьюшке как initial-данные. Дальнейшие фильтры/пагинация — клиентские,
 * через `/api/clients` (см. ClientsView).
 *
 * П.9 REMEDIATION — Server Components для страниц-списков.
 */
export default async function ClientsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const [items, total] = await Promise.all([
    prisma.client.findMany({
      include: { _count: { select: { requests: true } } },
      orderBy: { createdAt: "desc" },
      take: PAGE_SIZE,
    }),
    prisma.client.count(),
  ]);

  return <ClientsView initialItems={items} initialTotal={total} />;
}
