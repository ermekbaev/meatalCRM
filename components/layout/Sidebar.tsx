"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { AvatarDialog } from "./AvatarDialog";
import {
  LayoutDashboard, ClipboardList, Users, CheckSquare,
  FileText, LogOut, Factory, BookOpen, ChevronRight, Calculator,
  Layers, Scissors, Box, BarChart2, Receipt, Warehouse, Building2,
} from "lucide-react";
import { cn, ROLE_LABELS } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";
import { PushSubscribeButton } from "@/components/PushSubscribeButton";

type NavItem = { href: string; label: string; icon: any; foreman?: boolean };

const navItems: NavItem[] = [
  { href: "/dashboard",  label: "Главная",     icon: LayoutDashboard },
  { href: "/requests",   label: "Заявки",       icon: ClipboardList },
  { href: "/tasks",      label: "Задачи",        icon: CheckSquare, foreman: true },
  { href: "/clients",    label: "Контрагенты",  icon: Users },
  { href: "/offers",     label: "КП",            icon: FileText },
  { href: "/invoices",   label: "Счета",         icon: Receipt },
  { href: "/analytics",  label: "Аналитика",    icon: BarChart2 },
  { href: "/calculator", label: "Калькулятор",  icon: Calculator },
  { href: "/warehouse",  label: "Склад",         icon: Warehouse, foreman: true },
  { href: "/companies",  label: "Компании",     icon: Building2 },
];

const settingsItems = [
  { href: "/settings/users",           label: "Пользователи",    icon: Users },
  { href: "/settings/catalog",         label: "Услуги/Товары",   icon: BookOpen },
  { href: "/settings/catalog/metals",  label: "Металлы",         icon: Layers },
  { href: "/settings/catalog/bending", label: "Гибка",           icon: Box },
  { href: "/settings/catalog/cutting", label: "Резка",           icon: Scissors },
  { href: "/settings/company",         label: "Реквизиты",       icon: Factory },
];

// Опрос счётчика новых портальных заявок. Не SWR, чтобы не тащить лишнюю
// зависимость только ради одного индикатора.
const NEW_POLL_MS = 60_000;

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [newPortalCount, setNewPortalCount] = useState(0);
  const role = session?.user?.role;
  const isAdmin = role === "ADMIN";
  const isManager = role === "MANAGER";
  const isForeman = role === "FOREMAN";
  const visibleNav = isForeman ? navItems.filter((i) => i.foreman) : navItems;

  const fetchNewCount = useCallback(async () => {
    if (!isAdmin && !isManager) return;
    try {
      const res = await fetch("/api/portal/new-count");
      if (!res.ok) return;
      const data = await res.json();
      setNewPortalCount(data.count ?? 0);
    } catch {}
  }, [isAdmin, isManager]);

  useEffect(() => {
    fetchNewCount();
    const t = setInterval(fetchNewCount, NEW_POLL_MS);
    return () => clearInterval(t);
  }, [fetchNewCount, pathname]);

  return (
    <aside className="hidden lg:flex fixed inset-y-0 left-0 z-50 w-60 flex-col bg-[#212121] border-r border-white/10">
      {/* Logo */}
      <div className="flex h-18 items-center px-4 border-b border-white/10">
        <Image
          src="/logo_white.svg"
          alt="ORIENT-LASER"
          width={200}
          height={52}
          className="object-contain"
          priority
        />
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
        {visibleNav.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-all duration-150",
                active
                  ? "bg-orange-600 text-white"
                  : "text-white/60 hover:bg-white/10 hover:text-white"
              )}
            >
              <Icon className={cn(
                "h-4 w-4 shrink-0 transition-colors",
                active ? "text-orange-100" : "text-white/40 group-hover:text-white/80"
              )} />
              <span className="flex-1 truncate">{item.label}</span>
              {item.href === "/companies" && newPortalCount > 0 && (
                <span
                  className={cn(
                    "ml-auto rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-none",
                    active ? "bg-white text-orange-600" : "bg-orange-500 text-white"
                  )}
                  title="Новых заявок"
                >
                  {newPortalCount}
                </span>
              )}
              {active && item.href !== "/companies" && (
                <ChevronRight className="ml-auto h-3 w-3 text-white/40" />
              )}
            </Link>
          );
        })}

        {isAdmin && (
          <div className="pt-4">
            <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-widest text-white/30">
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
                        ? "bg-orange-600 text-white"
                        : "text-white/60 hover:bg-white/10 hover:text-white"
                    )}
                  >
                    <Icon className={cn(
                      "h-4 w-4 shrink-0",
                      active ? "text-orange-100" : "text-white/40 group-hover:text-white/80"
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
      <div className="border-t border-white/10 p-3">
        <div className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-white/10 transition-colors">
          <button
            onClick={() => setAvatarOpen(true)}
            className="flex min-w-0 flex-1 items-center gap-3 text-left"
            title="Изменить фото"
          >
            <Avatar name={session?.user?.name} src={session?.user?.avatarUrl} size={28} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-white/90">{session?.user?.name}</p>
              <p className="truncate text-[11px] text-white/40">
                {session?.user?.position
                  || (session?.user?.role && ROLE_LABELS[session.user.role])
                  || ""}
              </p>
            </div>
          </button>
          <PushSubscribeButton compact />
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="text-white/30 hover:text-white/70 transition-colors"
            title="Выйти"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <AvatarDialog open={avatarOpen} onOpenChange={setAvatarOpen} />
    </aside>
  );
}
