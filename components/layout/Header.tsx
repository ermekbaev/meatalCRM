"use client";
import { Menu } from "lucide-react";
import { useSidebar } from "./DashboardShell";
import { NotificationsBell } from "./NotificationsBell";

interface HeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export function Header({ title, subtitle, actions }: HeaderProps) {
  const { toggle, insideShell } = useSidebar();

  return (
    <header className="safe-area-inset-top sticky top-0 z-40 flex h-14 lg:h-18 items-center justify-between border-b border-slate-200 bg-white/85 px-4 backdrop-blur-md lg:px-6 supports-[backdrop-filter]:bg-white/75">
      <div className="flex items-center gap-3">
        {insideShell && (
          <button
            onClick={toggle}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <Menu className="h-5 w-5" />
          </button>
        )}
        <div>
          <h1 className="text-[15px] lg:text-base font-semibold tracking-tight text-slate-800 leading-tight">{title}</h1>
          {subtitle && <p className="mt-0.5 text-xs text-slate-400">{subtitle}</p>}
        </div>
      </div>
      <div className="flex items-center gap-3">
        {actions}
        {/* Колокольчик уведомлений — внутри DashboardShell (админ/менеджер).
            Включатель push перенесён в блок пользователя (Sidebar / мобильное меню). */}
        {insideShell && <NotificationsBell />}
      </div>
    </header>
  );
}
