"use client";
import { Menu } from "lucide-react";
import { useSidebar } from "./DashboardShell";
import { NotificationsBell } from "./NotificationsBell";
import { PushSubscribeButton } from "@/components/PushSubscribeButton";

interface HeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export function Header({ title, subtitle, actions }: HeaderProps) {
  const { toggle, insideShell } = useSidebar();

  return (
    <header className="safe-area-inset-top sticky top-0 z-40 flex h-14 lg:h-18 items-center justify-between border-b border-slate-200 bg-white px-4 lg:px-6">
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
          <h1 className="text-[15px] font-semibold text-slate-800 leading-tight">{title}</h1>
          {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      <div className="flex items-center gap-3">
        {actions}
        {/* Push и колокольчик уже есть в ForemanTopBar — здесь показываем только
            внутри DashboardShell (админ/менеджер), чтобы не дублировать. */}
        {insideShell && (
          <>
            <PushSubscribeButton compact />
            <NotificationsBell />
          </>
        )}
      </div>
    </header>
  );
}
