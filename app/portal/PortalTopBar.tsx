"use client";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { LogOut, ClipboardList, Plus, Package } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/portal", label: "Мои заявки", icon: ClipboardList, exact: true },
  { href: "/portal/requests/new", label: "Новая заявка", icon: Plus },
  { href: "/portal/positions", label: "Моя номенклатура", icon: Package },
];

export function PortalTopBar({ userName, companyName }: { userName: string; companyName: string }) {
  const pathname = usePathname();

  return (
    <header className="safe-area-inset-top sticky top-0 z-20 bg-white border-b border-slate-200">
      <div className="px-4 py-3 flex items-center gap-3">
        <Link href="/portal" className="shrink-0">
          <Image
            src="/logo.svg"
            alt="ORIENT-LASER"
            width={140}
            height={36}
            className="h-9 w-auto object-contain"
            priority
          />
        </Link>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-slate-400 truncate">Кабинет «{companyName}»</p>
          <p className="text-sm font-semibold text-slate-900 truncate">{userName}</p>
        </div>
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs text-red-600 hover:bg-red-50"
        >
          <LogOut className="h-3.5 w-3.5" /> Выйти
        </button>
      </div>
      <nav className="px-2 flex items-center gap-1 overflow-x-auto border-t border-slate-100">
        {NAV.map((item) => {
          const Icon = item.icon;
          const active = item.exact
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "inline-flex items-center gap-1.5 whitespace-nowrap px-3 py-2 text-sm border-b-2 transition-colors",
                active
                  ? "border-orange-500 text-orange-600 font-medium"
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
