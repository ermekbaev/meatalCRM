import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/layout/DashboardShell";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const role = (session.user as any).role;
  if (role === "EMPLOYEE") redirect("/operator");

  if (role === "FOREMAN") {
    return (
      <div className="flex h-screen flex-col bg-gray-50">
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    );
  }

  return (
    <DashboardShell>
      <main className="flex-1 overflow-y-auto">{children}</main>
    </DashboardShell>
  );
}
