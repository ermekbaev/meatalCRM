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

  const companies = await prisma.client.findMany({
    where: {
      isPortalEnabled: true,
      ...(role === "MANAGER" ? { managerId: session.user.id } : {}),
    },
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
  });

  return <CompaniesView companies={companies} canCreate={role === "ADMIN"} />;
}
