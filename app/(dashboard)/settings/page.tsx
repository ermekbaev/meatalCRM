"use client";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { SETTINGS_GROUPS } from "@/components/layout/SettingsNav";

export default function SettingsOverviewPage() {
  return (
    <>
      <Header title="Настройки" subtitle="Справочники, реквизиты и доступы" />

      <div className="p-4 lg:p-6 space-y-7">
        {SETTINGS_GROUPS.map((group) => (
          <section key={group.title}>
            <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-slate-400">
              {group.title}
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {group.items.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="group flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 transition-all hover:border-orange-200 hover:shadow-sm"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 transition-colors group-hover:bg-orange-50 group-hover:text-orange-600">
                      <Icon className="h-4.5 w-4.5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[14px] font-medium text-slate-800">{item.label}</span>
                      <span className="mt-0.5 block text-[12px] leading-snug text-slate-400">{item.desc}</span>
                    </span>
                    <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-slate-300 transition-colors group-hover:text-orange-500" />
                  </Link>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </>
  );
}
