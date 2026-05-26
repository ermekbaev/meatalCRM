import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CompaniesView } from "./CompaniesView";

/**
 * Список компаний-кабинетов. ADMIN видит все, MANAGER — только свои
 * (где он `managerId`). Middleware уже отсекает CLIENT и прочие роли,
 * здесь — защита данных на уровне выборки.
 */
export default async function CompaniesPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const role = session.user.role;
  if (role !== "ADMIN" && role !== "MANAGER") redirect("/dashboard");

  const where = {
    isPortalEnabled: true,
    ...(role === "MANAGER" ? { managerId: session.user.id } : {}),
  };

  const [companies, newGroups] = await Promise.all([
    prisma.client.findMany({
      where,
      select: {
        id: true,
        name: true,
        inn: true,
        phone: true,
        email: true,
        createdAt: true,
        manager: { select: { id: true, name: true } },
        _count: { select: { portalRequests: true, portalUsers: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    // Отдельным запросом — счётчик ещё не открытых заявок по каждой компании
    // (firstViewedAt IS NULL). Гаснет автоматически, как только менеджер
    // открывает страницу заявки. _count.select не поддерживает два разных
    // фильтра на одну и ту же связь, поэтому считаем groupBy.
    prisma.portalRequest.groupBy({
      by: ["companyId"],
      where: { firstViewedAt: null, company: where },
      _count: { _all: true },
    }),
  ]);

  const newByCompany = new Map(newGroups.map((g) => [g.companyId, g._count._all]));
  const companiesWithNew = companies.map((c) => ({
    ...c,
    newRequestsCount: newByCompany.get(c.id) ?? 0,
  }));

  return <CompaniesView companies={companiesWithNew} canCreate={role === "ADMIN"} />;
}
