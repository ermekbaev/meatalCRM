"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, Factory, Users, BookOpen, Layers, Box, Scissors, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

export type SettingsItem = {
  href: string;
  label: string;
  short: string;
  desc: string;
  icon: any;
};

// Единый источник правды для сайдбара раздела, мобильных чипов и страницы-обзора.
export const SETTINGS_GROUPS: { title: string; items: SettingsItem[] }[] = [
  {
    title: "Организация",
    items: [
      { href: "/settings/company", label: "Реквизиты компании", short: "Реквизиты", desc: "Юр. данные, банк, печать и подпись", icon: Factory },
      { href: "/settings/users",   label: "Пользователи",        short: "Пользователи", desc: "Сотрудники, роли и доступы",        icon: Users },
    ],
  },
  {
    title: "Справочники",
    items: [
      { href: "/settings/catalog",         label: "Услуги и товары", short: "Услуги/Товары", desc: "Номенклатура и цены",        icon: BookOpen },
      { href: "/settings/catalog/metals",  label: "Металлы",          short: "Металлы",       desc: "Марки, толщины, стоимость",  icon: Layers },
      { href: "/settings/catalog/bending", label: "Гибка",            short: "Гибка",         desc: "Тарифы на гибку",            icon: Box },
      { href: "/settings/catalog/cutting", label: "Резка",            short: "Резка",         desc: "Цены на лазерную резку",     icon: Scissors },
    ],
  },
];

const ALL_ITEMS = SETTINGS_GROUPS.flatMap((g) => g.items);

export function SettingsNav() {
  const pathname = usePathname();

  return (
    <>
      {/* ── Десктоп: собственный сайдбар раздела, справа от основного (w-60) ── */}
      <aside className="hidden lg:flex fixed inset-y-0 left-60 z-40 w-56 flex-col border-r border-slate-200 bg-white">
        <div className="flex h-18 shrink-0 flex-col justify-center gap-1 border-b border-slate-200 px-4">
          <Link
            href="/dashboard"
            className="inline-flex w-fit items-center gap-1 text-[11px] font-medium text-slate-400 transition-colors hover:text-orange-600"
          >
            <ArrowLeft className="h-3 w-3" />
            В CRM
          </Link>
          <div className="flex items-center gap-2">
            <Settings className="h-4 w-4 text-orange-600" />
            <span className="text-[15px] font-semibold tracking-tight text-slate-800">Настройки</span>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {SETTINGS_GROUPS.map((group) => (
            <div key={group.title} className="mb-5 last:mb-0">
              <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                {group.title}
              </p>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const active = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "group relative flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors",
                        active
                          ? "bg-orange-50 text-orange-700"
                          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                      )}
                    >
                      {active && (
                        <span className="absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-orange-600" />
                      )}
                      <Icon
                        className={cn(
                          "h-4 w-4 shrink-0 transition-colors",
                          active ? "text-orange-600" : "text-slate-400 group-hover:text-slate-600"
                        )}
                      />
                      <span className="truncate">{item.short}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </aside>

      {/* ── Мобильный: горизонтальная лента разделов ── */}
      <div className="lg:hidden border-b border-slate-200 bg-white">
        <div className="hscroll-hidden flex gap-2 overflow-x-auto px-4 py-2.5">
          <Link
            href="/settings"
            className={cn(
              "shrink-0 rounded-full border px-3 py-1.5 text-[12px] font-medium transition-colors",
              pathname === "/settings"
                ? "border-orange-600 bg-orange-600 text-white"
                : "border-slate-200 bg-white text-slate-600"
            )}
          >
            Обзор
          </Link>
          {ALL_ITEMS.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "shrink-0 rounded-full border px-3 py-1.5 text-[12px] font-medium transition-colors",
                  active
                    ? "border-orange-600 bg-orange-600 text-white"
                    : "border-slate-200 bg-white text-slate-600"
                )}
              >
                {item.short}
              </Link>
            );
          })}
        </div>
      </div>
    </>
  );
}
