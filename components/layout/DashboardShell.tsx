"use client";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import {
  LayoutDashboard, ClipboardList, Users, CheckSquare,
  FileText, Factory, BookOpen, X, LogOut, Calculator,
  Layers, Scissors, Box, Receipt, BarChart2, Warehouse, Building2, PhoneCall,
} from "lucide-react";
import { cn, ROLE_LABELS } from "@/lib/utils";
import { Sidebar } from "./Sidebar";
import { Avatar } from "@/components/ui/avatar";
import { AvatarDialog } from "./AvatarDialog";
import { PushSubscribeButton } from "@/components/PushSubscribeButton";

// insideShell — признак того, что Header рендерится внутри DashboardShell (у админа/
// менеджера). Под ForemanTopBar (мастер/оператор/подрядчик) провайдера нет, флаг
// остаётся false, и Header не дублирует колокольчик и кнопку push.
const SidebarCtx = createContext({ isOpen: false, toggle: () => {}, close: () => {}, insideShell: false });
export const useSidebar = () => useContext(SidebarCtx);

// Все пункты — для полноэкранного мобильного меню
type NavItem = { href: string; label: string; mobileLabel: string; icon: any; foreman?: boolean };

const navItems: NavItem[] = [
  { href: "/dashboard",  label: "Главная",     mobileLabel: "Главная",  icon: LayoutDashboard },
  { href: "/requests",   label: "Заявки",       mobileLabel: "Заявки",   icon: ClipboardList },
  { href: "/tasks",      label: "Задачи",        mobileLabel: "Задачи",   icon: CheckSquare, foreman: true },
  { href: "/clients",    label: "Контрагенты",  mobileLabel: "Клиенты",  icon: Users },
  { href: "/followups",  label: "Обзвон",        mobileLabel: "Обзвон",   icon: PhoneCall },
  { href: "/offers",     label: "КП",            mobileLabel: "КП",       icon: FileText },
  { href: "/invoices",   label: "Счета",         mobileLabel: "Счета",    icon: Receipt },
  { href: "/analytics",  label: "Аналитика",    mobileLabel: "Аналит.",  icon: BarChart2 },
  { href: "/calculator", label: "Калькулятор",  mobileLabel: "Калькул.", icon: Calculator },
];

// Только 4 пункта — для боттом-бара
navItems.push({ href: "/warehouse", label: "Склад", mobileLabel: "Склад", icon: Warehouse, foreman: true });
navItems.push({ href: "/companies", label: "Компании", mobileLabel: "Кабинеты", icon: Building2 });

const bottomTabItems = navItems.slice(0, 4);

const settingsItems = [
  { href: "/settings/users",           label: "Пользователи",  icon: Users },
  { href: "/settings/catalog",         label: "Услуги/Товары", icon: BookOpen },
  { href: "/settings/catalog/metals",  label: "Металлы",       icon: Layers },
  { href: "/settings/catalog/bending", label: "Гибка",         icon: Box },
  { href: "/settings/catalog/cutting", label: "Резка",         icon: Scissors },
  { href: "/settings/company",         label: "Реквизиты",     icon: Factory },
];

// Тот же эндпоинт, что в десктопном Sidebar — счётчик NEW портальных заявок.
const NEW_POLL_MS = 60_000;

function useNewPortalCount(enabled: boolean) {
  const [count, setCount] = useState(0);
  const fetchCount = useCallback(async () => {
    if (!enabled) return;
    try {
      const res = await fetch("/api/portal/new-count");
      if (!res.ok) return;
      const data = await res.json();
      setCount(data.count ?? 0);
    } catch {}
  }, [enabled]);
  useEffect(() => {
    fetchCount();
    const t = setInterval(fetchCount, NEW_POLL_MS);
    return () => clearInterval(t);
  }, [fetchCount]);
  return count;
}

function MobileMenu({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [avatarOpen, setAvatarOpen] = useState(false);
  const role = session?.user?.role;
  const isAdmin = role === "ADMIN";
  const isManager = role === "MANAGER";
  const isForeman = role === "FOREMAN";
  const visibleNav = isForeman ? navItems.filter((i) => i.foreman) : navItems;
  const newPortalCount = useNewPortalCount(isAdmin || isManager);

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 lg:hidden transition-opacity duration-200",
        isOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
      )}
    >
      <div className="absolute inset-0 bg-white flex flex-col safe-area-inset-top">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <div className="flex items-center gap-3" suppressHydrationWarning>
            <Image
              src="/logo.svg"
              alt="ORIENT-LASER"
              width={180}
              height={46}
              className="object-contain"
            />
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {visibleNav.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-4 rounded-xl px-4 py-3.5 text-[15px] font-medium transition-all",
                  active
                    ? "bg-orange-600 text-white"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                )}
              >
                <Icon className={cn("h-5 w-5 shrink-0", active ? "text-orange-100" : "text-slate-400")} />
                <span className="flex-1">{item.label}</span>
                {item.href === "/companies" && newPortalCount > 0 && (
                  <span
                    className={cn(
                      "ml-auto rounded-full px-2 py-0.5 text-[11px] font-semibold leading-none",
                      active ? "bg-white text-orange-600" : "bg-orange-500 text-white"
                    )}
                  >
                    {newPortalCount}
                  </span>
                )}
              </Link>
            );
          })}

          {isAdmin && (
            <div className="pt-3 mt-2 border-t border-slate-200">
              <p className="mb-2 px-4 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                Настройки
              </p>
              {settingsItems.map((item) => {
                const Icon = item.icon;
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onClose}
                    className={cn(
                      "flex items-center gap-4 rounded-xl px-4 py-3.5 text-[15px] font-medium transition-all",
                      active
                        ? "bg-orange-600 text-white"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                    )}
                  >
                    <Icon className={cn("h-5 w-5 shrink-0", active ? "text-orange-100" : "text-slate-400")} />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          )}
        </nav>

        {/* User footer */}
        <div className="border-t border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setAvatarOpen(true)}
              className="flex min-w-0 flex-1 items-center gap-3 text-left"
              title="Изменить фото"
            >
              <Avatar name={session?.user?.name} src={session?.user?.avatarUrl} size={36} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-medium text-slate-800">{session?.user?.name}</p>
                <p className="truncate text-[11px] text-slate-400">
                  {session?.user?.position
                    || (session?.user?.role && ROLE_LABELS[session.user.role])
                    || ""}
                </p>
              </div>
            </button>
            <PushSubscribeButton compact />
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              title="Выйти"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <AvatarDialog open={avatarOpen} onOpenChange={setAvatarOpen} />
    </div>
  );
}

function BottomTabBar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const role = session?.user?.role;
  const isForeman = role === "FOREMAN";
  const items = isForeman ? navItems.filter((i) => i.foreman) : bottomTabItems;
  // Боттом-бар не содержит «Компании», но если когда-нибудь добавят — индикатор
  // переиспользуется. Hook вызываем всегда, чтобы не нарушать порядок.
  const newPortalCount = useNewPortalCount(role === "ADMIN" || role === "MANAGER");

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 lg:hidden border-t border-slate-200 bg-white safe-area-inset-bottom">
      <div className="flex items-stretch justify-around">
        {items.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          const showBadge = item.href === "/companies" && newPortalCount > 0;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-1 flex-col items-center gap-0.5 px-1 pt-2 pb-3 transition-colors",
                active ? "text-slate-800" : "text-slate-400 hover:text-slate-600"
              )}
            >
              <span className="relative">
                <Icon className="h-5 w-5 shrink-0" />
                {showBadge && (
                  <span className="absolute -right-2 -top-1 min-w-4 rounded-full bg-orange-500 px-1 text-center text-[10px] font-semibold leading-4 text-white">
                    {newPortalCount}
                  </span>
                )}
              </span>
              <span className="text-[10px] font-medium leading-tight">{item.mobileLabel}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const toggle = () => setIsOpen((p) => !p);
  const close = () => setIsOpen(false);

  return (
    <SidebarCtx.Provider value={{ isOpen, toggle, close, insideShell: true }}>
      {/* Mobile full-screen menu */}
      <MobileMenu isOpen={isOpen} onClose={close} />

      <div className="flex h-screen bg-gray-50">
        {/* Desktop sidebar only */}
        <Sidebar />

        <div className="flex flex-1 flex-col overflow-hidden lg:ml-60">
          {children}
          {/* Spacer so content isn't hidden under bottom tab bar (учитывает safe-area iOS) */}
          <div className="shrink-0 lg:hidden h-[calc(4rem+env(safe-area-inset-bottom))]" />
        </div>
      </div>

      {/* Bottom tab bar (mobile only) */}
      <BottomTabBar />
    </SidebarCtx.Provider>
  );
}
