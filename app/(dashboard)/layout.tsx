import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { ForemanTopBar } from "@/components/layout/ForemanTopBar";
import { ROLE_LABELS } from "@/lib/utils";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const user = session.user;
  const role = user.role;

  // CLIENT — внешний пользователь компании, в основной CRM ему делать нечего.
  if (role === "CLIENT") redirect("/portal");

  if (role === "FOREMAN" || role === "ENGINEER" || role === "CONTRACTOR" || role === "EMPLOYEE") {
    return (
      <div className="flex h-screen flex-col bg-gray-50">
        <ForemanTopBar
          userName={user.name ?? ""}
          roleLabel={user.position || ROLE_LABELS[role] || "Сотрудник"}
          variant={
            role === "CONTRACTOR" ? "tasksOnly"
            : role === "EMPLOYEE" ? "operator"
            : role === "ENGINEER" ? "engineer"
            : "foreman"
          }
        />
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
