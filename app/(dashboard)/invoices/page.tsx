import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { InvoicesView, PAGE_SIZE } from "./InvoicesView";

/**
 * Server component для списка счетов.
 *
 * Грузит первую страницу через prisma и отдаёт её клиентской вьюшке как
 * initial-данные. Дальнейшие фильтры/пагинация — через `/api/invoices`.
 *
 * П.9 REMEDIATION — Server Components для страниц-списков.
 */
export default async function InvoicesPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const [items, total] = await Promise.all([
    prisma.invoice.findMany({
      include: {
        client: true,
        request: { select: { id: true, number: true, title: true } },
        createdBy: { select: { id: true, name: true } },
        items: { orderBy: { id: "asc" } },
      },
      orderBy: { createdAt: "desc" },
      take: PAGE_SIZE,
    }),
    prisma.invoice.count(),
  ]);

  return <InvoicesView initialItems={items} initialTotal={total} />;
}
