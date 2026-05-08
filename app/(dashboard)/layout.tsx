import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/layout/DashboardShell";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const role = (session.user as any).role;
  if (role === "EMPLOYEE") redirect("/operator");

  return (
    <DashboardShell>
      <main className="flex-1 overflow-y-auto">{children}</main>
    </DashboardShell>
  );
}
