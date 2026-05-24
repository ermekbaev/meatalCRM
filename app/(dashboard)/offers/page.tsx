import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DEFAULT_PAGE_SIZE as PAGE_SIZE } from "@/lib/pagination";
import { OffersView } from "./OffersView";

/**
 * Server component для списка КП.
 *
 * Грузит первую страницу через prisma и отдаёт её клиентской вьюшке как
 * initial-данные. Дальнейшие фильтры/пагинация — через `/api/offers`.
 *
 * П.9 REMEDIATION — Server Components для страниц-списков.
 */
export default async function OffersPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const [items, total] = await Promise.all([
    prisma.commercialOffer.findMany({
      include: {
        request: { include: { client: true } },
        client: true,
        createdBy: { select: { id: true, name: true } },
        manager: { select: { id: true, name: true, phone: true, email: true } },
        items: true,
      },
      orderBy: { createdAt: "desc" },
      take: PAGE_SIZE,
    }),
    prisma.commercialOffer.count(),
  ]);

  return <OffersView initialItems={items} initialTotal={total} />;
}
