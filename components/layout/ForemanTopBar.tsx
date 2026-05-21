"use client";
import { signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { LogOut, CheckSquare, ClipboardList, Boxes, Calculator } from "lucide-react";
import { NotificationsBell } from "@/components/layout/NotificationsBell";
import { PushSubscribeButton } from "@/components/PushSubscribeButton";
import { cn } from "@/lib/utils";

const TASKS      = { href: "/tasks",      label: "Задачи",     icon: CheckSquare };
const REQUESTS   = { href: "/requests",   label: "Заявки",     icon: ClipboardList };
const WAREHOUSE  = { href: "/warehouse",  label: "Склад",      icon: Boxes };
const CALCULATOR = { href: "/calculator", label: "Калькулятор", icon: Calculator };

// Набор разделов в шапке по роли:
// - foreman   — мастер: задачи, заявки, склад
// - engineer  — конструктор: задачи, склад, калькулятор
// - operator  — оператор: задачи и склад
// - tasksOnly — подрядчик: только задачи
const NAV_BY_VARIANT = {
  foreman:   [TASKS, REQUESTS, WAREHOUSE],
  engineer:  [TASKS, WAREHOUSE, CALCULATOR],
  operator:  [TASKS, WAREHOUSE],
  tasksOnly: [TASKS],
} as const;

export function ForemanTopBar({
  userName,
  roleLabel = "Мастер цеха",
  variant = "foreman",
}: {
  userName: string;
  roleLabel?: string;
  variant?: "foreman" | "engineer" | "operator" | "tasksOnly";
}) {
  const pathname = usePathname();
  const nav = NAV_BY_VARIANT[variant];
  return (
    <header className="safe-area-inset-top sticky top-0 z-50 bg-white border-b border-slate-200">
      <div className="px-4 py-3 flex items-center gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-xs text-slate-400">{roleLabel}</p>
          <p className="text-sm font-semibold text-slate-900 truncate">{userName}</p>
        </div>
        <PushSubscribeButton compact />
        <NotificationsBell />
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs text-red-600 hover:bg-red-50"
        >
          <LogOut className="h-3.5 w-3.5" /> Выйти
        </button>
      </div>
      <nav className="flex items-center gap-1 px-2">
        {nav.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 transition-colors",
                active
                  ? "border-orange-500 text-orange-600"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
