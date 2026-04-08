import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CLIENT_TYPE_LABELS, REQUEST_STATUS_LABELS, REQUEST_STATUS_COLORS, formatDate, formatCurrency } from "@/lib/utils";
import Link from "next/link";
import { ArrowLeft, Building2, User, Phone, Mail, MapPin, Hash, MessageSquare, Globe, Landmark, CreditCard, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="grid grid-cols-2 gap-2 py-2 border-b border-slate-100 last:border-0">
      <span className="text-xs text-slate-400">{label}</span>
      <span className="text-xs font-medium text-slate-700 text-right">{value}</span>
    </div>
  );
}

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const client = await prisma.client.findUnique({
    where: { id },
    include: {
      requests: {
        orderBy: { createdAt: "desc" },
        include: { assignee: true },
      },
    },
  });

  if (!client) notFound();

  const hasRequisites = client.inn || client.kpp || client.ogrn || client.director;
  const hasBank = client.bankName || client.bankAccount || client.bankBik || client.bankCorAccount;
  const hasAddress = client.legalAddress || client.postalAddress;

  return (
    <div>
      <Header title={client.shortName || client.name} />
      <div className="p-6 space-y-5">
        <div>
          <Link href="/clients">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" /> Назад
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          {/* Левая колонка */}
          <div className="space-y-4">
            {/* Шапка */}
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white ${client.type === "COMPANY" ? "bg-blue-500" : "bg-green-500"}`}>
                    {client.type === "COMPANY" ? <Building2 className="h-5 w-5" /> : <User className="h-5 w-5" />}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800 leading-tight">{client.shortName || client.name}</p>
                    {client.shortName && client.shortName !== client.name && (
                      <p className="text-xs text-slate-400 mt-0.5">{client.name}</p>
                    )}
                    <Badge variant="secondary" className="mt-1 text-[10px]">{CLIENT_TYPE_LABELS[client.type]}</Badge>
                  </div>
                </div>

                <div className="space-y-2">
                  {client.phone && (
                    <a href={`tel:${client.phone}`} className="flex items-center gap-2 text-sm text-slate-600 hover:text-orange-600 transition-colors">
                      <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      {client.phone}
                    </a>
                  )}
                  {client.email && (
                    <a href={`mailto:${client.email}`} className="flex items-center gap-2 text-sm text-slate-600 hover:text-orange-600 transition-colors">
                      <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      {client.email}
                    </a>
                  )}
                  {client.website && (
                    <a href={client.website} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm text-slate-600 hover:text-orange-600 transition-colors">
                      <Globe className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      {client.website}
                    </a>
                  )}
                  {client.comment && (
                    <div className="flex items-start gap-2 text-sm text-slate-500 pt-1">
                      <MessageSquare className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
                      <span>{client.comment}</span>
                    </div>
                  )}
                </div>
                <p className="mt-3 text-[11px] text-slate-300">Добавлен {formatDate(client.createdAt)}</p>
              </CardContent>
            </Card>

            {/* Реквизиты */}
            {hasRequisites && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                    <Hash className="h-3.5 w-3.5" /> Реквизиты
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <InfoRow label="ИНН" value={client.inn} />
                  <InfoRow label="КПП" value={client.kpp} />
                  <InfoRow label="ОГРН" value={client.ogrn} />
                  <InfoRow label="Руководитель" value={client.director} />
                </CardContent>
              </Card>
            )}

            {/* Адреса */}
            {hasAddress && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5" /> Адреса
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <InfoRow label="Юридический" value={client.legalAddress} />
                  <InfoRow label="Почтовый" value={client.postalAddress} />
                </CardContent>
              </Card>
            )}

            {/* Банк */}
            {hasBank && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                    <Landmark className="h-3.5 w-3.5" /> Банк
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <InfoRow label="Банк" value={client.bankName} />
                  <InfoRow label="Р/с" value={client.bankAccount} />
                  <InfoRow label="К/с" value={client.bankCorAccount} />
                  <InfoRow label="БИК" value={client.bankBik} />
                </CardContent>
              </Card>
            )}
          </div>

          {/* Правая колонка — заявки */}
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-semibold text-slate-500 uppercase tracking-widest">
                  Заявки ({client.requests.length})
                </CardTitle>
                <Link href={`/requests/new?clientId=${client.id}`}>
                  <Button size="sm">Новая заявка</Button>
                </Link>
              </CardHeader>
              <CardContent className="p-0">
                {client.requests.length === 0 ? (
                  <p className="px-6 py-10 text-center text-sm text-slate-300">Заявок нет</p>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {client.requests.map((req) => (
                      <Link
                        key={req.id}
                        href={`/requests/${req.id}`}
                        className="flex items-center gap-4 px-5 py-3 hover:bg-slate-50 transition-colors"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-slate-800">
                            <span className="text-slate-400 font-mono text-xs mr-1">#{req.number}</span>
                            {req.title}
                          </p>
                          <p className="text-xs text-slate-400 mt-0.5">
                            {req.assignee?.name ?? "Не назначен"} · {formatDate(req.createdAt)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {req.amount && (
                            <span className="text-sm font-medium text-slate-600 tabular-nums">
                              {formatCurrency(req.amount)}
                            </span>
                          )}
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${REQUEST_STATUS_COLORS[req.status]}`}>
                            {REQUEST_STATUS_LABELS[req.status]}
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
