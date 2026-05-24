import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NewCompanyForm } from "./NewCompanyForm";

/**
 * Создание нового кабинета — только ADMIN. Грузим список потенциальных
 * менеджеров (ADMIN/MANAGER, не заблокированные) для select.
 */
export default async function NewCompanyPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/companies");

  const managers = await prisma.user.findMany({
    where: {
      isBlocked: false,
      role: { in: ["ADMIN", "MANAGER"] },
    },
    select: { id: true, name: true, role: true },
    orderBy: { name: "asc" },
  });

  return <NewCompanyForm managers={managers} />;
}
