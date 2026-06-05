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
    <header className="safe-area-inset-top sticky top-0 z-20 bg-[#212121] border-b border-white/10">
      <div className="px-4 py-3 flex items-center gap-3">
        <Link href="/portal" className="shrink-0">
          <Image
            src="/logo_white.svg"
            alt="ORIENT-LASER"
            width={140}
            height={36}
            className="h-9 w-auto object-contain"
            priority
          />
        </Link>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-white/50 truncate">Кабинет «{companyName}»</p>
          <p className="text-sm font-semibold text-white truncate">{userName}</p>
        </div>
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs text-red-400 hover:bg-white/10"
        >
          <LogOut className="h-3.5 w-3.5" /> Выйти
        </button>
      </div>
      <nav className="px-2 flex items-center gap-1 overflow-x-auto border-t border-white/10">
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
                  ? "border-orange-500 text-orange-400 font-medium"
                  : "border-transparent text-white/60 hover:text-white"
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
