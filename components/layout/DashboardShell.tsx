"use client";
import { createContext, useContext, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import {
  LayoutDashboard, ClipboardList, Users, CheckSquare,
  FileText, Factory, BookOpen, X, LogOut, Calculator,
  Layers, Scissors, Box,
} from "lucide-react";
import { cn, ROLE_LABELS } from "@/lib/utils";
import { Sidebar } from "./Sidebar";

const SidebarCtx = createContext({ isOpen: false, toggle: () => {}, close: () => {} });
export const useSidebar = () => useContext(SidebarCtx);

// Все пункты — для полноэкранного мобильного меню
const navItems = [
  { href: "/dashboard",  label: "Главная",     mobileLabel: "Главная",  icon: LayoutDashboard },
  { href: "/requests",   label: "Заявки",        mobileLabel: "Заявки",   icon: ClipboardList },
  { href: "/tasks",      label: "Задачи",         mobileLabel: "Задачи",   icon: CheckSquare },
  { href: "/clients",    label: "Контрагенты",   mobileLabel: "Клиенты",  icon: Users },
  { href: "/offers",     label: "КП",             mobileLabel: "КП",       icon: FileText },
  { href: "/calculator", label: "Калькулятор",   mobileLabel: "Калькул.", icon: Calculator },
];

// Только 4 пункта — для боттом-бара
const bottomTabItems = navItems.slice(0, 4);

const settingsItems = [
  { href: "/settings/users",           label: "Пользователи",  icon: Users },
  { href: "/settings/catalog",         label: "Услуги/Товары", icon: BookOpen },
  { href: "/settings/catalog/metals",  label: "Металлы",       icon: Layers },
  { href: "/settings/catalog/bending", label: "Гибка",         icon: Box },
  { href: "/settings/catalog/cutting", label: "Резка",         icon: Scissors },
  { href: "/settings/company",         label: "Реквизиты",     icon: Factory },
];

function MobileMenu({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const isAdmin = (session?.user as any)?.role === "ADMIN";

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 lg:hidden transition-opacity duration-200",
        isOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
      )}
    >
      <div className="absolute inset-0 bg-white flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <div className="flex items-center gap-3" suppressHydrationWarning>
            <Image
              src="/public/logo.svg"
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
          {navItems.map((item) => {
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
                {item.label}
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
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-orange-600 text-[12px] font-semibold text-white">
              {session?.user?.name?.charAt(0).toUpperCase() ?? "U"}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-medium text-slate-800">{session?.user?.name}</p>
              <p className="truncate text-[11px] text-slate-400">
                {ROLE_LABELS[(session?.user as any)?.role] ?? ""}
              </p>
            </div>
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
    </div>
  );
}

function BottomTabBar() {
  const pathname = usePathname();

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 lg:hidden border-t border-slate-200 bg-white safe-area-inset-bottom">
      <div className="flex items-stretch justify-around">
        {bottomTabItems.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-1 flex-col items-center gap-0.5 px-1 pt-2 pb-3 transition-colors",
                active ? "text-slate-800" : "text-slate-400 hover:text-slate-600"
              )}
            >
              <Icon className="h-5 w-5 shrink-0" />
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
    <SidebarCtx.Provider value={{ isOpen, toggle, close }}>
      {/* Mobile full-screen menu */}
      <MobileMenu isOpen={isOpen} onClose={close} />

      <div className="flex h-screen bg-gray-50">
        {/* Desktop sidebar only */}
        <Sidebar />

        <div className="flex flex-1 flex-col overflow-hidden lg:ml-60">
          {children}
          {/* Spacer so content isn't hidden under bottom tab bar */}
          <div className="h-15 shrink-0 lg:hidden" />
        </div>
      </div>

      {/* Bottom tab bar (mobile only) */}
      <BottomTabBar />
    </SidebarCtx.Provider>
  );
}
