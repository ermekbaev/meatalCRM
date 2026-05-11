"use client";
import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";
import { NotificationsBell } from "@/components/layout/NotificationsBell";
import { PushSubscribeButton } from "@/components/PushSubscribeButton";

export function ForemanTopBar({ userName, roleLabel = "Мастер цеха" }: { userName: string; roleLabel?: string }) {
  return (
    <header className="safe-area-inset-top sticky top-0 z-30 bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-2">
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
    </header>
  );
}
