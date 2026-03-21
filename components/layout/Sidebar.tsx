"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import {
  LayoutDashboard, ClipboardList, Users,
  FileText, LogOut, Factory, BookOpen, ChevronRight,
} from "lucide-react";
import { cn, ROLE_LABELS } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Dashboard",       icon: LayoutDashboard },
  { href: "/requests",  label: "Заявки",           icon: ClipboardList },
  { href: "/clients",   label: "Контрагенты",      icon: Users },
  { href: "/offers",    label: "КП",               icon: FileText },
];

const settingsItems = [
  { href: "/settings/users",   label: "Пользователи",    icon: Users },
  { href: "/settings/catalog", label: "Справочник услуг", icon: BookOpen },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const isAdmin = (session?.user as any)?.role === "ADMIN";

  return (
    <aside className="fixed inset-y-0 left-0 z-50 flex w-60 flex-col bg-slate-50 border-r border-slate-200">
      {/* Logo */}
      <div className="flex h-15 items-center gap-3 px-5 border-b border-slate-200">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-700 shadow-sm">
          <Factory className="h-4 w-4 text-slate-200" />
        </div>
        <div>
          <p className="text-[13px] font-semibold text-slate-800 leading-tight">МеталлCRM</p>
          <p className="text-[11px] text-slate-400 leading-tight">Металлообработка</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-all duration-150",
                active
                  ? "bg-slate-700 text-white"
                  : "text-slate-500 hover:bg-slate-100 hover:text-slate-800"
              )}
            >
              <Icon className={cn(
                "h-4 w-4 shrink-0 transition-colors",
                active ? "text-slate-300" : "text-slate-400 group-hover:text-slate-600"
              )} />
              {item.label}
              {active && <ChevronRight className="ml-auto h-3 w-3 text-slate-400" />}
            </Link>
          );
        })}

        {isAdmin && (
          <div className="pt-4">
            <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
              Настройки
            </p>
            <div className="space-y-0.5">
              {settingsItems.map((item) => {
                const Icon = item.icon;
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "group flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-all duration-150",
                      active
                        ? "bg-slate-700 text-white"
                        : "text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                    )}
                  >
                    <Icon className={cn(
                      "h-4 w-4 shrink-0",
                      active ? "text-slate-300" : "text-slate-400 group-hover:text-slate-600"
                    )} />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </nav>

      {/* User */}
      <div className="border-t border-slate-200 p-3">
        <div className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-slate-100 transition-colors">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-200 text-[11px] font-semibold text-slate-600">
            {session?.user?.name?.charAt(0).toUpperCase() ?? "U"}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[12px] font-medium text-slate-700">{session?.user?.name}</p>
            <p className="truncate text-[11px] text-slate-400">
              {ROLE_LABELS[(session?.user as any)?.role] ?? ""}
            </p>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="text-slate-300 hover:text-slate-500 transition-colors"
            title="Выйти"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
}
