"use client";
import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Building2, Eye } from "lucide-react";
import { formatDate } from "@/lib/utils";

type Company = {
  id: string;
  name: string;
  inn: string | null;
  phone: string | null;
  email: string | null;
  createdAt: Date | string;
  manager: { id: string; name: string } | null;
  _count: { portalRequests: number; portalUsers: number };
};

export function CompaniesView({ companies, canCreate }: { companies: Company[]; canCreate: boolean }) {
  return (
    <div>
      <Header title="Компании" subtitle="Кабинеты клиентов в портале" />
      <div className="p-4 lg:p-6 space-y-4">
        {canCreate && (
          <div className="flex justify-end">
            <Link href="/companies/new">
              <Button>
                <Plus className="mr-2 h-4 w-4" /> Создать кабинет
              </Button>
            </Link>
          </div>
        )}

        {/* Mobile cards */}
        <div className="md:hidden space-y-2">
          {companies.length === 0 ? (
            <div className="rounded-xl border border-gray-200 bg-white p-6 text-center text-sm text-gray-400">
              Кабинетов пока нет
            </div>
          ) : (
            companies.map((c) => (
              <Link
                key={c.id}
                href={`/companies/${c.id}`}
                className="block rounded-xl border border-gray-200 bg-white p-3"
              >
                <div className="flex items-start gap-2">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-500 text-white">
                    <Building2 className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-gray-900 text-sm truncate">{c.name}</p>
                    <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-gray-500">
                      <span>{c._count.portalUsers} польз.</span>
                      <span>·</span>
                      <span>{c._count.portalRequests} заявок</span>
                      {c.manager && (
                        <>
                          <span>·</span>
                          <span>отв. {c.manager.name}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>

        {/* Desktop table */}
        <div className="hidden md:block rounded-xl border border-gray-200 bg-white overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead>Компания</TableHead>
                <TableHead>ИНН</TableHead>
                <TableHead>Телефон</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Менеджер</TableHead>
                <TableHead>Польз.</TableHead>
                <TableHead>Заявок</TableHead>
                <TableHead>Создан</TableHead>
                <TableHead className="w-16">{""}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {companies.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-gray-400">
                    Кабинетов пока нет
                  </TableCell>
                </TableRow>
              ) : (
                companies.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500 text-white">
                          <Building2 className="h-4 w-4" />
                        </div>
                        <Link href={`/companies/${c.id}`} className="font-medium text-gray-900 hover:text-orange-600 transition-colors">
                          {c.name}
                        </Link>
                      </div>
                    </TableCell>
                    <TableCell>{c.inn ?? "—"}</TableCell>
                    <TableCell>{c.phone ?? "—"}</TableCell>
                    <TableCell>{c.email ?? "—"}</TableCell>
                    <TableCell>{c.manager?.name ?? "—"}</TableCell>
                    <TableCell>
                      <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                        {c._count.portalUsers}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="rounded-full bg-orange-50 px-2 py-0.5 text-xs font-medium text-orange-700">
                        {c._count.portalRequests}
                      </span>
                    </TableCell>
                    <TableCell>{formatDate(c.createdAt as any)}</TableCell>
                    <TableCell>
                      <Link href={`/companies/${c.id}`}>
                        <Button size="icon" variant="ghost">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
