import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { formatDate } from "@/lib/utils";

const STATUS_LABELS = {
  NEW: "Новая",
  IN_PROGRESS: "В работе",
  READY: "Готова",
} as const;
const STATUS_COLORS = {
  NEW: "bg-blue-100 text-blue-700",
  IN_PROGRESS: "bg-amber-100 text-amber-700",
  READY: "bg-emerald-100 text-emerald-700",
} as const;

export default async function PortalIndexPage() {
  const session = await getServerSession(authOptions);
  // Слои защиты уже отработали в layout — здесь просто страхуемся для TS.
  if (!session?.user.companyId) redirect("/login");

  const requests = await prisma.portalRequest.findMany({
    where: { companyId: session.user.companyId },
    select: {
      id: true,
      number: true,
      title: true,
      status: true,
      createdAt: true,
      _count: { select: { items: true, comments: true, files: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="p-4 lg:p-6 max-w-3xl mx-auto space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-lg font-semibold text-slate-900">Мои заявки</h1>
        <Link href="/portal/requests/new">
          <Button size="sm">
            <Plus className="mr-1 h-4 w-4" /> Новая заявка
          </Button>
        </Link>
      </div>

      {requests.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
          <p className="text-sm text-slate-500">У вас пока нет заявок</p>
          <Link href="/portal/requests/new" className="mt-3 inline-block">
            <Button>Создать первую</Button>
          </Link>
        </div>
      ) : (
        <ul className="space-y-2">
          {requests.map((r) => (
            <li key={r.id}>
              <Link
                href={`/portal/requests/${r.id}`}
                className="block rounded-xl border border-slate-200 bg-white p-4 hover:border-orange-300 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400">#{r.number}</span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS_COLORS[r.status]}`}
                      >
                        {STATUS_LABELS[r.status]}
                      </span>
                    </div>
                    <p className="mt-1 text-sm font-medium text-slate-900 truncate">{r.title}</p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {r._count.items} позиций · {r._count.comments} комм. · {r._count.files} файл.
                    </p>
                  </div>
                  <div className="text-xs text-slate-400 whitespace-nowrap">
                    {formatDate(r.createdAt)}
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
