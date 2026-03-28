"use client";
import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  REQUEST_STATUS_LABELS, REQUEST_STATUS_COLORS,
  PRIORITY_LABELS, PRIORITY_COLORS,
  OFFER_STATUS_LABELS, OFFER_STATUS_COLORS,
  formatDate, formatDateTime, formatCurrency
} from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Send, Loader2, Clock, Plus, Trash2, Save, Paperclip, X, FileText, Download, BookOpen } from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { CatalogPickerDialog } from "@/components/CatalogPickerDialog";

export default function RequestDetailPage() {
  const params = useParams();
  const { data: session } = useSession();
  const [request, setRequest] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [comment, setComment] = useState("");
  const [sendingComment, setSendingComment] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [catalog, setCatalog] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [itemsSaving, setItemsSaving] = useState(false);
  const [files, setFiles] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [catalogOpen, setCatalogOpen] = useState(false);

  const fetchRequest = useCallback(async () => {
    const res = await fetch(`/api/requests/${params.id}`);
    if (!res.ok) { setLoading(false); return; }
    const data = await res.json();
    setRequest(data);
    setItems(data.items ?? []);
    setLoading(false);
  }, [params.id]);

  const fetchFiles = useCallback(async () => {
    fetch(`/api/requests/${params.id}/files`).then((r) => r.json()).then(setFiles).catch(() => {});
  }, [params.id]);

  useEffect(() => {
    fetchRequest();
    fetchFiles();
    fetch("/api/users").then((r) => r.json()).then(setUsers).catch(() => {});
    fetch("/api/catalog").then((r) => r.json()).then(setCatalog).catch(() => {});
  }, [fetchRequest, fetchFiles]);

  const uploadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    await fetch(`/api/requests/${params.id}/files`, { method: "POST", body: fd });
    await fetchFiles();
    setUploading(false);
    e.target.value = "";
  };

  const deleteFile = async (fileId: string) => {
    await fetch(`/api/requests/${params.id}/files/${fileId}`, { method: "DELETE" });
    setFiles((prev) => prev.filter((f) => f.id !== fileId));
  };

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

  // --- Позиции ---
  const addItem = () => {
    setItems((prev) => [...prev, { id: `new-${Date.now()}`, name: "", quantity: 1, unit: "шт", price: 0, discount: 0, total: 0, isCustomerMaterial: false }]);
  };

  const addFromCatalog = (catalogItem: any) => {
    setItems((prev) => [...prev, {
      id: `new-${Date.now()}`,
      name: catalogItem.name,
      quantity: 1,
      unit: catalogItem.unit ?? "шт",
      price: catalogItem.price ?? 0,
      discount: 0,
      total: catalogItem.price ?? 0,
      isCustomerMaterial: false,
    }]);
  };

  const removeItem = (idx: number) => setItems((prev) => prev.filter((_, i) => i !== idx));

  const updateItem = (idx: number, field: string, value: any) => {
    setItems((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      // пересчёт суммы
      const q = parseFloat(field === "quantity" ? value : next[idx].quantity) || 0;
      const p = parseFloat(field === "price" ? value : next[idx].price) || 0;
      const d = parseFloat(field === "discount" ? value : next[idx].discount) || 0;
      next[idx].total = q * p * (1 - d / 100);
      return next;
    });
  };

  const saveItems = async () => {
    setItemsSaving(true);
    await fetch(`/api/requests/${params.id}/items`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items }),
    });
    await fetchRequest();
    setItemsSaving(false);
  };

  const subtotal = items.reduce((s, it) => s + (parseFloat(it.total) || 0), 0);
  const customerMaterialTotal = items.filter(it => it.isCustomerMaterial).reduce((s, it) => s + (parseFloat(it.total) || 0), 0);
  const ourRevenue = subtotal - customerMaterialTotal;
  const vatAmount = request?.vatIncluded ? subtotal * 0.2 : 0;
  const totalWithVat = subtotal + vatAmount;

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
      <CatalogPickerDialog open={catalogOpen} onClose={() => setCatalogOpen(false)} onSelect={addFromCatalog} />
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
            {/* Заголовок */}
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-mono text-gray-400 mb-1">#{request.number}</p>
                    <h2 className="text-xl font-semibold text-gray-900">{request.title}</h2>
                    <p className="mt-1 text-sm text-gray-500">
                      Клиент:{" "}
                      <Link href={`/clients/${request.client?.id}`} className="text-blue-600 hover:underline">
                        {request.client?.name}
                      </Link>
                    </p>
                  </div>
                  <div className="flex gap-2 flex-wrap justify-end">
                    <span className={`rounded-full px-3 py-1 text-sm font-medium ${REQUEST_STATUS_COLORS[request.status]}`}>
                      {REQUEST_STATUS_LABELS[request.status]}
                    </span>
                    <span className={`rounded-full px-3 py-1 text-sm font-medium ${PRIORITY_COLORS[request.priority]}`}>
                      {PRIORITY_LABELS[request.priority]}
                    </span>
                  </div>
                </div>
              </CardHeader>
              {request.description && (
                <CardContent>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{request.description}</p>
                </CardContent>
              )}
            </Card>

            {/* Позиции */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="text-base">Позиции</CardTitle>
                {!isEmployee && (
                  <div className="flex gap-2">
                    <Button type="button" size="sm" variant="outline" onClick={() => setCatalogOpen(true)}>
                      <BookOpen className="mr-1 h-4 w-4" /> Из каталога
                    </Button>
                    <Button type="button" size="sm" variant="outline" onClick={addItem}>
                      <Plus className="mr-1 h-4 w-4" /> Вручную
                    </Button>
                    <Button type="button" size="sm" onClick={saveItems} disabled={itemsSaving}>
                      {itemsSaving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Save className="mr-1 h-4 w-4" />}
                      Сохранить
                    </Button>
                  </div>
                )}
              </CardHeader>
              <CardContent className="p-0">
                {items.length === 0 ? (
                  <div className="px-6 pb-6 text-center">
                    <p className="text-sm text-slate-400 mb-3">Нет позиций</p>
                    {!isEmployee && (
                      <div className="flex gap-2 justify-center">
                        <Button type="button" variant="outline" size="sm" onClick={() => setCatalogOpen(true)}>
                          <BookOpen className="mr-1 h-4 w-4" /> Из каталога
                        </Button>
                        <Button type="button" variant="outline" size="sm" onClick={addItem}>
                          <Plus className="mr-1 h-4 w-4" /> Вручную
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-slate-100 bg-slate-50">
                            <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 w-[30%]">Наименование</th>
                            <th className="px-2 py-2 text-center text-xs font-medium text-slate-500 w-16">Кол-во</th>
                            <th className="px-2 py-2 text-center text-xs font-medium text-slate-500 w-16">Ед.</th>
                            <th className="px-2 py-2 text-right text-xs font-medium text-slate-500 w-24">Цена, ₽</th>
                            <th className="px-2 py-2 text-center text-xs font-medium text-slate-500 w-16">Скидка %</th>
                            <th className="px-2 py-2 text-right text-xs font-medium text-slate-500 w-24">Сумма, ₽</th>
                            <th className="px-2 py-2 text-center text-xs font-medium text-slate-500 w-20" title="Материал заказчика">Мат. зак.</th>
                            {!isEmployee && <th className="px-2 py-2 w-8"></th>}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {items.map((item, index) => (
                            <tr key={item.id ?? index} className="hover:bg-slate-50/50">
                              <td className="px-4 py-2">
                                {isEmployee ? (
                                  <span className="text-sm text-slate-800">{item.name}</span>
                                ) : (
                                  <>
                                    <Input
                                      value={item.name}
                                      onChange={(e) => updateItem(index, "name", e.target.value)}
                                      placeholder="Наименование"
                                      className="h-8 text-sm"
                                      list={`catalog-list-${index}`}
                                    />
                                    <datalist id={`catalog-list-${index}`}>
                                      {catalog.map((s) => <option key={s.id} value={s.name} />)}
                                    </datalist>
                                  </>
                                )}
                              </td>
                              <td className="px-2 py-2">
                                {isEmployee ? (
                                  <span className="text-sm text-slate-800 block text-center">{item.quantity}</span>
                                ) : (
                                  <Input
                                    value={item.quantity}
                                    onChange={(e) => updateItem(index, "quantity", e.target.value)}
                                    type="number" min="0" step="0.01"
                                    className="h-8 text-sm text-center w-full"
                                  />
                                )}
                              </td>
                              <td className="px-2 py-2">
                                {isEmployee ? (
                                  <span className="text-sm text-slate-800 block text-center">{item.unit}</span>
                                ) : (
                                  <Input
                                    value={item.unit}
                                    onChange={(e) => updateItem(index, "unit", e.target.value)}
                                    className="h-8 text-sm text-center w-full"
                                  />
                                )}
                              </td>
                              <td className="px-2 py-2">
                                {isEmployee ? (
                                  <span className="text-sm text-slate-800 block text-right">{formatCurrency(item.price)}</span>
                                ) : (
                                  <Input
                                    value={item.price}
                                    onChange={(e) => updateItem(index, "price", e.target.value)}
                                    type="number" min="0" step="0.01"
                                    className="h-8 text-sm text-right w-full"
                                  />
                                )}
                              </td>
                              <td className="px-2 py-2">
                                {isEmployee ? (
                                  <span className="text-sm text-slate-800 block text-center">{item.discount}%</span>
                                ) : (
                                  <Input
                                    value={item.discount}
                                    onChange={(e) => updateItem(index, "discount", e.target.value)}
                                    type="number" min="0" max="100" step="0.1"
                                    className="h-8 text-sm text-center w-full"
                                  />
                                )}
                              </td>
                              <td className={`px-2 py-2 text-right text-sm font-medium whitespace-nowrap ${item.isCustomerMaterial ? "text-amber-600" : "text-slate-700"}`}>
                                {formatCurrency(parseFloat(item.total) || 0)}
                              </td>
                              <td className="px-2 py-2 text-center">
                                {isEmployee ? (
                                  item.isCustomerMaterial ? (
                                    <span className="text-xs text-amber-600 font-medium">Да</span>
                                  ) : null
                                ) : (
                                  <input
                                    type="checkbox"
                                    checked={item.isCustomerMaterial ?? false}
                                    onChange={(e) => updateItem(index, "isCustomerMaterial", e.target.checked)}
                                    className="h-4 w-4 accent-amber-500 cursor-pointer"
                                    title="Материал заказчика (давальческое сырьё)"
                                  />
                                )}
                              </td>
                              {!isEmployee && (
                                <td className="px-2 py-2">
                                  <button
                                    onClick={() => removeItem(index)}
                                    className="text-slate-300 hover:text-red-500 transition-colors"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </td>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {/* Строка добавления позиции */}
                    {!isEmployee && (
                      <div className="border-t border-slate-100 px-4 py-2">
                        <button
                          type="button"
                          onClick={addItem}
                          className="flex items-center gap-2 w-full text-sm text-slate-400 hover:text-slate-600 transition-colors py-1"
                        >
                          <Plus className="h-4 w-4" />
                          <span>Добавить позицию</span>
                        </button>
                      </div>
                    )}

                    {/* Инлайн комментарий */}
                    <div className="border-t border-slate-100 px-4 py-3">
                      <textarea
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        placeholder="Комментарий"
                        rows={3}
                        className="w-full resize-none bg-transparent text-sm text-slate-700 placeholder:text-slate-300 outline-none"
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) sendComment();
                        }}
                      />
                      {comment.trim() && (
                        <div className="flex justify-end mt-1">
                          <Button size="sm" onClick={sendComment} disabled={sendingComment}>
                            {sendingComment ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Send className="mr-1 h-3 w-3" />}
                            Отправить
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Итог */}
                    <div className="border-t border-slate-100 px-6 py-3 space-y-1.5">
                      <div className="flex justify-end gap-8 text-sm text-slate-500">
                        <span>Позиций: {items.length}</span>
                        <span>{request?.vatIncluded ? "Без НДС:" : "Итого:"}</span>
                        <span className="font-semibold text-slate-800 min-w-24 text-right">{formatCurrency(subtotal)}</span>
                      </div>
                      {request?.vatIncluded && (
                        <>
                          <div className="flex justify-end gap-8 text-xs text-slate-400">
                            <span>НДС 20%:</span>
                            <span className="min-w-24 text-right">+{formatCurrency(vatAmount)}</span>
                          </div>
                          <div className="flex justify-end gap-8 text-sm font-semibold text-slate-800 border-t border-slate-100 pt-1.5">
                            <span>Итого с НДС:</span>
                            <span className="min-w-24 text-right">{formatCurrency(totalWithVat)}</span>
                          </div>
                        </>
                      )}
                      {customerMaterialTotal > 0 && (
                        <>
                          <div className="flex justify-end gap-8 text-xs text-amber-600">
                            <span>Материал заказчика:</span>
                            <span className="min-w-24 text-right">− {formatCurrency(customerMaterialTotal)}</span>
                          </div>
                          <div className="flex justify-end gap-8 text-sm font-medium text-slate-700 border-t border-slate-100 pt-1.5">
                            <span>Наша выручка:</span>
                            <span className="min-w-24 text-right text-green-700">{formatCurrency(ourRevenue)}</span>
                          </div>
                        </>
                      )}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Комментарии (история) */}
            {request.comments?.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base">Комментарии</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3 max-h-80 overflow-y-auto">
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
              </CardContent>
            </Card>
            )}

            {/* Файлы */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Paperclip className="h-4 w-4" /> Файлы {files.length > 0 && <span className="text-slate-400 font-normal">({files.length})</span>}
                </CardTitle>
                <label className="cursor-pointer">
                  <input type="file" className="hidden" onChange={uploadFile} disabled={uploading} />
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 border border-slate-200 rounded-lg px-3 py-1.5 hover:bg-slate-50 transition-colors">
                    {uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                    Загрузить
                  </span>
                </label>
              </CardHeader>
              <CardContent>
                {files.length === 0 ? (
                  <p className="text-sm text-slate-400">Нет прикреплённых файлов</p>
                ) : (
                  <div className="space-y-2">
                    {files.map((f: any) => (
                      <div key={f.id} className="flex items-center gap-3 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                        <FileText className="h-4 w-4 shrink-0 text-slate-400" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-slate-700">{f.originalName}</p>
                          <p className="text-xs text-slate-400">{(f.size / 1024).toFixed(0)} КБ · {f.uploadedBy?.name}</p>
                        </div>
                        <a href={`/api/files?key=${encodeURIComponent(f.filename)}&name=${encodeURIComponent(f.originalName)}`} className="text-slate-400 hover:text-slate-600 transition-colors">
                          <Download className="h-4 w-4" />
                        </a>
                        <button onClick={() => deleteFile(f.id)} className="text-slate-300 hover:text-red-500 transition-colors">
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* История */}
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
                          {log.oldValue && <span className="text-gray-400"> с &quot;{log.oldValue}&quot;</span>}
                          {log.newValue && <span> на &quot;{log.newValue}&quot;</span>}
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
                  </>
                )}

                {/* НДС */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-gray-700">С НДС</p>
                    <p className="text-xs text-gray-400">НДС 20% включён в цены</p>
                  </div>
                  <Switch
                    checked={request?.vatIncluded ?? false}
                    onCheckedChange={(v) => updateField("vatIncluded", v)}
                    disabled={isEmployee}
                  />
                </div>

                {/* Способ оплаты */}
                <div className="space-y-2">
                  <p className="text-xs font-medium text-gray-500">Способ оплаты</p>
                  <Select
                    value={request.paymentMethod ?? ""}
                    onValueChange={(v) => updateField("paymentMethod", v || null)}
                    disabled={isEmployee}
                  >
                    <SelectTrigger><SelectValue placeholder="Не выбран" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Наличные</SelectItem>
                      <SelectItem value="transfer">Перевод</SelectItem>
                      <SelectItem value="non_cash">Безналичный расчёт</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {subtotal > 0 && (
                  <div className="rounded-lg bg-slate-50 p-3 space-y-1.5">
                    <p className="text-xs text-slate-500">{request?.vatIncluded ? "Без НДС" : "Сумма по позициям"}</p>
                    <p className="text-lg font-semibold text-slate-800">{formatCurrency(subtotal)}</p>
                    {request?.vatIncluded && vatAmount > 0 && (
                      <>
                        <p className="text-xs text-slate-400">НДС 20%: +{formatCurrency(vatAmount)}</p>
                        <p className="text-sm font-semibold text-slate-800">Итого: {formatCurrency(totalWithVat)}</p>
                      </>
                    )}
                    {customerMaterialTotal > 0 && (
                      <div className="border-t border-slate-200 pt-1.5 mt-1.5 space-y-0.5">
                        <p className="text-xs text-amber-600">Матер. заказчика: {formatCurrency(customerMaterialTotal)}</p>
                        <p className="text-xs font-medium text-green-700">Наша выручка: {formatCurrency(ourRevenue)}</p>
                      </div>
                    )}
                  </div>
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

            {/* КП */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-base">КП ({request.offers?.length ?? 0})</CardTitle>
                <div className="flex items-center gap-2">
                  <Link href={`/invoices/new?requestId=${request.id}`}>
                    <Button size="sm" variant="outline">Создать счёт</Button>
                  </Link>
                  <Link href={`/offers/new?requestId=${request.id}`}>
                    <Button size="sm" variant="outline">Создать КП</Button>
                  </Link>
                </div>
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
                        <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${OFFER_STATUS_COLORS[o.status] ?? "bg-gray-100 text-gray-700"}`}>
                          {OFFER_STATUS_LABELS[o.status] ?? o.status}
                        </span>
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
