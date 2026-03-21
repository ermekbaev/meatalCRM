"use client";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  REQUEST_STATUS_LABELS, REQUEST_STATUS_COLORS,
  PRIORITY_LABELS, PRIORITY_COLORS,
  OFFER_STATUS_LABELS, OFFER_STATUS_COLORS,
  formatDate, formatDateTime, formatCurrency
} from "@/lib/utils";
import { ArrowLeft, Send, Loader2, Clock, User, DollarSign } from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";

export default function RequestDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const [request, setRequest] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [comment, setComment] = useState("");
  const [sendingComment, setSendingComment] = useState(false);
  const [users, setUsers] = useState<any[]>([]);

  const fetchRequest = async () => {
    const res = await fetch(`/api/requests/${params.id}`);
    const data = await res.json();
    setRequest(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchRequest();
    fetch("/api/users").then((r) => r.json()).then(setUsers).catch(() => {});
  }, [params.id]);

  const updateField = async (field: string, value: any) => {
    setSaving(true);
    const res = await fetch(`/api/requests/${params.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value }),
    });
    const updated = await res.json();
    setRequest((prev: any) => ({ ...prev, ...updated }));
    setSaving(false);
  };

  const sendComment = async () => {
    if (!comment.trim()) return;
    setSendingComment(true);
    const res = await fetch(`/api/requests/${params.id}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: comment }),
    });
    const newComment = await res.json();
    setRequest((prev: any) => ({ ...prev, comments: [...(prev.comments ?? []), newComment] }));
    setComment("");
    setSendingComment(false);
  };

  if (loading) {
    return (
      <div>
        <Header title="Заявка" />
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      </div>
    );
  }

  if (!request) return null;

  const isEmployee = (session?.user as any)?.role === "EMPLOYEE";

  return (
    <div>
      <Header title={`Заявка #${request.number}`} />
      <div className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <Link href="/requests">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" /> Назад
            </Button>
          </Link>
          {saving && (
            <span className="flex items-center gap-1 text-xs text-gray-400">
              <Loader2 className="h-3 w-3 animate-spin" /> Сохранение...
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Main */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-mono text-gray-400 mb-1">#{request.number}</p>
                    <h2 className="text-xl font-semibold text-gray-900">{request.title}</h2>
                    <p className="mt-1 text-sm text-gray-500">
                      Клиент: <Link href={`/clients/${request.client?.id}`} className="text-blue-600 hover:underline">{request.client?.name}</Link>
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <span className={`rounded-full px-3 py-1 text-sm font-medium ${REQUEST_STATUS_COLORS[request.status]}`}>
                      {REQUEST_STATUS_LABELS[request.status]}
                    </span>
                    <span className={`rounded-full px-3 py-1 text-sm font-medium ${PRIORITY_COLORS[request.priority]}`}>
                      {PRIORITY_LABELS[request.priority]}
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {request.description && (
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{request.description}</p>
                )}
                {request.services?.length > 0 && (
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Услуги</p>
                    <div className="flex flex-wrap gap-2">
                      {request.services.map((s: string) => (
                        <span key={s} className="rounded-full border border-blue-200 bg-blue-50 px-3 py-0.5 text-xs text-blue-700">{s}</span>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Comments */}
            <Card>
              <CardHeader><CardTitle className="text-base">Комментарии</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3 max-h-80 overflow-y-auto">
                  {request.comments?.length === 0 && (
                    <p className="text-sm text-gray-400">Нет комментариев</p>
                  )}
                  {request.comments?.map((c: any) => (
                    <div key={c.id} className="flex gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-medium text-blue-700">
                        {c.user?.name?.charAt(0)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium text-gray-900">{c.user?.name}</span>
                          <span className="text-xs text-gray-400">{formatDateTime(c.createdAt)}</span>
                        </div>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">{c.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 pt-2 border-t border-gray-100">
                  <Textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Напишите комментарий..."
                    rows={2}
                    className="flex-1"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) sendComment();
                    }}
                  />
                  <Button onClick={sendComment} disabled={sendingComment || !comment.trim()} size="icon">
                    {sendingComment ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* History */}
            {request.changeLogs?.length > 0 && (
              <Card>
                <CardHeader><CardTitle className="text-base">История изменений</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {request.changeLogs.map((log: any) => (
                      <div key={log.id} className="flex items-start gap-3 text-sm">
                        <Clock className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
                        <div>
                          <span className="font-medium text-gray-700">{log.user?.name}</span>
                          {" изменил "}<span className="font-mono text-xs bg-gray-100 px-1 rounded">{log.field}</span>
                          {log.oldValue && <span className="text-gray-400"> с "{log.oldValue}"</span>}
                          {log.newValue && <span> на "{log.newValue}"</span>}
                          <span className="ml-2 text-xs text-gray-400">{formatDateTime(log.createdAt)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Параметры</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {!isEmployee && (
                  <>
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-gray-500">Статус</p>
                      <Select value={request.status} onValueChange={(v) => updateField("status", v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {Object.entries(REQUEST_STATUS_LABELS).map(([k, v]) => (
                            <SelectItem key={k} value={k}>{v}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-gray-500">Приоритет</p>
                      <Select value={request.priority} onValueChange={(v) => updateField("priority", v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {Object.entries(PRIORITY_LABELS).map(([k, v]) => (
                            <SelectItem key={k} value={k}>{v}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-gray-500">Ответственный</p>
                      <Select
                        value={request.assigneeId ?? "none"}
                        onValueChange={(v) => updateField("assigneeId", v === "none" ? null : v)}
                      >
                        <SelectTrigger><SelectValue placeholder="Не назначен" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Не назначен</SelectItem>
                          {users.map((u: any) => (
                            <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-gray-500">Сумма (₽)</p>
                      <Input
                        type="number"
                        defaultValue={request.amount ?? ""}
                        onBlur={(e) => updateField("amount", e.target.value ? parseFloat(e.target.value) : null)}
                        placeholder="0"
                      />
                    </div>
                  </>
                )}

                <div className="pt-2 space-y-2 border-t border-gray-100">
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Clock className="h-3 w-3" />
                    Создана: {formatDate(request.createdAt)}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Clock className="h-3 w-3" />
                    Обновлена: {formatDate(request.updatedAt)}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Offers */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-base">КП ({request.offers?.length ?? 0})</CardTitle>
                <Link href={`/offers/new?requestId=${request.id}`}>
                  <Button size="sm" variant="outline">Создать КП</Button>
                </Link>
              </CardHeader>
              <CardContent className="p-0">
                {request.offers?.length === 0 ? (
                  <p className="px-4 pb-4 text-sm text-gray-400">Нет коммерческих предложений</p>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {request.offers.map((o: any) => (
                      <Link key={o.id} href={`/offers/${o.id}`} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50">
                        <div>
                          <p className="text-sm font-medium">КП #{o.number}</p>
                          <p className="text-xs text-gray-400">{formatCurrency(o.total)}</p>
                        </div>
                        <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${OFFER_STATUS_COLORS[o.status] ?? "bg-gray-100 text-gray-700"}`}>{OFFER_STATUS_LABELS[o.status] ?? o.status}</span>
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
