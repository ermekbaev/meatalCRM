import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PortalTopBar } from "./PortalTopBar";

/**
 * Корневой layout кабинета клиента. Сюда пускают только CLIENT с привязкой к
 * компании. Middleware уже редиректит остальных, layout — Слой 2 защиты.
 */
export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  if (session.user.role !== "CLIENT") redirect("/dashboard");
  if (!session.user.companyId) {
    // CLIENT без companyId не должен существовать, но если случилось — выходим.
    redirect("/login");
  }

  const company = await prisma.client.findFirst({
    where: { id: session.user.companyId, isPortalEnabled: true },
    select: { id: true, name: true },
  });
  if (!company) redirect("/login");

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <PortalTopBar userName={session.user.name ?? ""} companyName={company.name} />
      <main className="flex-1 pb-6">{children}</main>
    </div>
  );
}
