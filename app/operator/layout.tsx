import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { OperatorTopBar } from "./OperatorTopBar";

export default async function OperatorLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const user = session.user;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <OperatorTopBar userName={user.name ?? ""} role={user.role} />
      <main className="flex-1 pb-6">{children}</main>
    </div>
  );
}
