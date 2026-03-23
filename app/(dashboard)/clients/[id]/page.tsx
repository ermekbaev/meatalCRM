import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CLIENT_TYPE_LABELS, REQUEST_STATUS_LABELS, REQUEST_STATUS_COLORS, PRIORITY_LABELS, formatDate, formatCurrency } from "@/lib/utils";
import Link from "next/link";
import { ArrowLeft, Building2, User, Phone, Mail, MapPin, Hash, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";

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

  return (
    <div>
      <Header title={client.name} />
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/clients">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" /> Назад
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Info Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className={`flex h-12 w-12 items-center justify-center rounded-xl text-white ${client.type === "COMPANY" ? "bg-blue-500" : "bg-green-500"}`}>
                  {client.type === "COMPANY" ? <Building2 className="h-6 w-6" /> : <User className="h-6 w-6" />}
                </div>
                <div>
                  <CardTitle>{client.name}</CardTitle>
                  <Badge variant="secondary" className="mt-1">{CLIENT_TYPE_LABELS[client.type]}</Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {client.phone && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Phone className="h-4 w-4 text-gray-400" />
                  {client.phone}
                </div>
              )}
              {client.email && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Mail className="h-4 w-4 text-gray-400" />
                  {client.email}
                </div>
              )}
              {client.inn && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Hash className="h-4 w-4 text-gray-400" />
                  ИНН: {client.inn}
                </div>
              )}
              {client.legalAddress && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <MapPin className="h-4 w-4 text-gray-400" />
                  {client.legalAddress}
                </div>
              )}
              {client.comment && (
                <div className="flex items-start gap-2 text-sm text-gray-600">
                  <MessageSquare className="h-4 w-4 text-gray-400 mt-0.5" />
                  {client.comment}
                </div>
              )}
              <div className="pt-2 text-xs text-gray-400">
                Добавлен {formatDate(client.createdAt)}
              </div>
            </CardContent>
          </Card>

          {/* Requests */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">Заявки ({client.requests.length})</CardTitle>
                <Link href={`/requests/new?clientId=${client.id}`}>
                  <Button size="sm">Новая заявка</Button>
                </Link>
              </CardHeader>
              <CardContent className="p-0">
                {client.requests.length === 0 ? (
                  <p className="px-6 py-8 text-center text-sm text-gray-400">Заявок нет</p>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {client.requests.map((req) => (
                      <Link
                        key={req.id}
                        href={`/requests/${req.id}`}
                        className="flex items-center gap-4 px-6 py-3 hover:bg-gray-50 transition-colors"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-900">
                            #{req.number} {req.title}
                          </p>
                          <p className="text-xs text-gray-500">
                            {req.assignee?.name ?? "Не назначен"} · {formatDate(req.createdAt)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {req.amount && (
                            <span className="text-sm font-medium text-gray-700">
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
