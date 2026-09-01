import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { SettingsNav } from "@/components/layout/SettingsNav";

// Раздел настроек — со своим сайдбаром. Доступ только у ADMIN/MANAGER: у
// остальных ролей основной сайдбар (w-60) не рендерится, и позиционирование
// вложенного сайдбара было бы некорректным.
export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  const role = session?.user?.role;
  if (role !== "ADMIN" && role !== "MANAGER") redirect("/dashboard");

  return (
    <>
      <SettingsNav />
      <div className="lg:ml-56">{children}</div>
    </>
  );
}
