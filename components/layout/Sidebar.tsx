"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { AvatarDialog } from "./AvatarDialog";
import {
  LayoutDashboard, ClipboardList, Users, CheckSquare,
  FileText, LogOut, Calculator, Settings, ChevronRight,
  BarChart2, Receipt, Warehouse, Building2, PhoneCall,
} from "lucide-react";
import { cn, ROLE_LABELS } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";
import { PushSubscribeButton } from "@/components/PushSubscribeButton";

type NavItem = { href: string; label: string; icon: any; foreman?: boolean };
type NavGroup = { title: string; items: NavItem[] };

const navGroups: NavGroup[] = [
  {
    title: "Работа",
    items: [
      { href: "/dashboard", label: "Главная", icon: LayoutDashboard },
      { href: "/requests",  label: "Заявки",   icon: ClipboardList },
      { href: "/tasks",     label: "Задачи",    icon: CheckSquare, foreman: true },
      { href: "/warehouse", label: "Склад",     icon: Warehouse, foreman: true },
    ],
  },
  {
    title: "Продажи",
    items: [
      { href: "/clients",   label: "Контрагенты", icon: Users },
      { href: "/followups", label: "Обзвон",       icon: PhoneCall },
      { href: "/offers",    label: "КП",           icon: FileText },
      { href: "/invoices",  label: "Счета",        icon: Receipt },
      { href: "/companies", label: "Компании",    icon: Building2 },
    ],
  },
  {
    title: "Инструменты",
    items: [
      { href: "/analytics",  label: "Аналитика",   icon: BarChart2 },
      { href: "/calculator", label: "Калькулятор", icon: Calculator },
    ],
  },
];

// Опрос счётчика новых портальных заявок. Не SWR, чтобы не тащить лишнюю
// зависимость только ради одного индикатора.
const NEW_POLL_MS = 60_000;

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [newPortalCount, setNewPortalCount] = useState(0);
  const [followupCount, setFollowupCount] = useState(0);
  const role = session?.user?.role;
  const isAdmin = role === "ADMIN";
  const isManager = role === "MANAGER";
  const isForeman = role === "FOREMAN";
  const visibleGroups = navGroups
    .map((g) => ({ ...g, items: isForeman ? g.items.filter((i) => i.foreman) : g.items }))
    .filter((g) => g.items.length > 0);

  const fetchCounts = useCallback(async () => {
    if (!isAdmin && !isManager) return;
    try {
      const [portalRes, followRes] = await Promise.all([
        fetch("/api/portal/new-count"),
        // Заодно триггерит ленивую рассылку напоминаний «пора звонить».
        fetch("/api/followups/count"),
      ]);
      if (portalRes.ok) setNewPortalCount((await portalRes.json()).count ?? 0);
      if (followRes.ok) {
        const d = await followRes.json();
        setFollowupCount((d.overdue ?? 0) + (d.today ?? 0));
      }
    } catch {}
  }, [isAdmin, isManager]);

  useEffect(() => {
    fetchCounts();
    const t = setInterval(fetchCounts, NEW_POLL_MS);
    return () => clearInterval(t);
  }, [fetchCounts, pathname]);

  return (
    <aside className="hidden lg:flex fixed inset-y-0 left-0 z-50 w-60 flex-col border-r border-white/10 bg-linear-to-b from-[#262626] to-[#1a1a1a]">
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
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {visibleGroups.map((group) => (
          <div key={group.title} className="mb-5 last:mb-0">
            <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-widest text-white/25">
              {group.title}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                const active = pathname === item.href || pathname.startsWith(item.href + "/");
                const badge =
                  item.href === "/companies" ? newPortalCount
                  : item.href === "/followups" ? followupCount
                  : 0;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-colors duration-150",
                      active
                        ? "bg-orange-600 text-white shadow-sm shadow-black/30"
                        : "text-white/60 hover:bg-white/[0.07] hover:text-white"
                    )}
                  >
                    <Icon className={cn(
                      "h-4 w-4 shrink-0 transition-colors",
                      active ? "text-white" : "text-white/40 group-hover:text-white/80"
                    )} />
                    <span className="flex-1 truncate">{item.label}</span>
                    {badge > 0 && (
                      <span
                        className={cn(
                          "ml-auto rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-none",
                          active
                            ? "bg-white text-orange-600"
                            : item.href === "/followups"
                              ? "bg-rose-500 text-white"
                              : "bg-orange-500 text-white"
                        )}
                        title={item.href === "/followups" ? "Звонки на сегодня и просроченные" : "Новых заявок"}
                      >
                        {badge}
                      </span>
                    )}
                    {active && badge === 0 && (
                      <ChevronRight className="ml-auto h-3 w-3 text-white/50" />
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Настройки — отдельный раздел со своим сайдбаром */}
      {isAdmin && (
        <div className="px-3 pb-2">
          <Link
            href="/settings"
            className={cn(
              "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-colors duration-150",
              pathname.startsWith("/settings")
                ? "bg-white/10 text-white"
                : "text-white/60 hover:bg-white/[0.07] hover:text-white"
            )}
          >
            <Settings className={cn(
              "h-4 w-4 shrink-0 transition-colors",
              pathname.startsWith("/settings") ? "text-orange-500" : "text-white/40 group-hover:text-white/80"
            )} />
            <span className="flex-1 truncate">Настройки</span>
            <ChevronRight className="h-3 w-3 text-white/30" />
          </Link>
        </div>
      )}

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
