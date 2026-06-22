"use client";
import { signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
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
      <div className="px-3 py-2 flex items-center gap-2">
        <Link href={nav[0].href} className="shrink-0">
          <Image
            src="/logo.svg"
            alt="ORIENT-LASER"
            width={140}
            height={36}
            className="h-7 w-auto object-contain sm:h-9"
            priority
          />
        </Link>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] text-slate-400 leading-none truncate">{roleLabel}</p>
          <p className="text-xs font-semibold text-slate-900 truncate sm:text-sm">{userName}</p>
        </div>
        <PushSubscribeButton compact />
        <NotificationsBell />
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/login" })}
          title="Выйти"
          className="shrink-0 rounded-lg p-1.5 text-red-500 hover:bg-red-50"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
      <nav className="flex items-center gap-1 px-2 overflow-x-auto scrollbar-none">
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
