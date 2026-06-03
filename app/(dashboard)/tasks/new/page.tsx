"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PRIORITY_LABELS } from "@/lib/utils";
import { ArrowLeft, Building2, FileText, Loader2, Paperclip, Phone, X } from "lucide-react";
import Link from "next/link";

function useDropdownSearch(fetchUrl: (q: string) => string) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function outside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", outside);
    return () => document.removeEventListener("mousedown", outside);
  }, []);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    const q = query.trim();
    if (!q) { setResults([]); setOpen(false); return; }
    timer.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(fetchUrl(q));
        const data = await res.json();
        const items = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
        setResults(items);
        setOpen(true);
      } catch { setResults([]); }
      finally { setLoading(false); }
    }, 300);
  }, [query]);

  function clear() { setQuery(""); setResults([]); setOpen(false); }
  return { query, setQuery, results, loading, open, setOpen, ref, clear };
}

export default function NewTaskPage() {
  const router = useRouter();
  const [users, setUsers] = useState<any[]>([]);
  const [workshops, setWorkshops] = useState<any[]>([]);
  const [taskColumns, setTaskColumns] = useState<Array<{ key: string; name: string }>>([]);
  const [assigneeQuery, setAssigneeQuery] = useState("");

  const [selectedRequest, setSelectedRequest] = useState<any | null>(null);
  const [selectedClient, setSelectedClient] = useState<any | null>(null);

  const req = useDropdownSearch((q) => `/api/requests?search=${encodeURIComponent(q)}&pageSize=10`);
  const cli = useDropdownSearch((q) => `/api/clients?search=${encodeURIComponent(q)}&pageSize=20`);

  const { register, handleSubmit, setValue, watch, formState: { isSubmitting } } = useForm<{
    title: string;
    description: string;
    status: string;
    priority: string;
    dueDate: string;
    assigneeIds: string[];
    clientId: string;
    workshopId: string;
    sourceRequestId: string;
  }>({
    defaultValues: {
      title: "", description: "", status: "TODO", priority: "MEDIUM",
      dueDate: "", assigneeIds: [], clientId: "", workshopId: "", sourceRequestId: "",
    },
  });

  useEffect(() => {
    Promise.all([
      fetch("/api/users?role=FOREMAN&role=ENGINEER&role=CONTRACTOR").then((r) => r.json()).catch(() => []),
      fetch("/api/workshops").then((r) => r.json()).catch(() => []),
      fetch("/api/task-columns").then((r) => r.json()).catch(() => []),
    ]).then(([u, w, cols]) => {
      setUsers(u);
      setWorkshops(Array.isArray(w) ? w.filter((x: any) => !x.isVirtual) : []);
      setTaskColumns(Array.isArray(cols) ? cols : []);
    });
  }, []);

  async function pickRequest(r: any) {
    let files: any[] = [];
    try {
      const res = await fetch(`/api/requests/${r.id}/files`);
      if (res.ok) files = await res.json();
    } catch {}
    setSelectedRequest({ ...r, files });
    setValue("sourceRequestId", r.id);
    setValue("title", r.title || "");
    setValue("description", r.description || "");
    req.clear();
  }

  function clearRequest() {
    setSelectedRequest(null);
    setValue("sourceRequestId", "");
    setValue("title", "");
    setValue("description", "");
  }

  function pickClient(c: any) {
    setSelectedClient(c);
    setValue("clientId", c.id);
    cli.clear();
  }

  function clearClient() {
    setSelectedClient(null);
    setValue("clientId", "");
  }

  async function onSubmit(data: any) {
    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...data,
        assigneeIds: Array.isArray(data.assigneeIds) ? data.assigneeIds : [],
        clientId: data.clientId || null,
        workshopId: data.workshopId || null,
        dueDate: data.dueDate || null,
        sourceRequestId: data.sourceRequestId || null,
      }),
    });
    if (!res.ok) { alert("Ошибка при создании задачи. Попробуйте ещё раз."); return; }
    router.push("/tasks");
  }

  const status = watch("status");
  const priority = watch("priority");

  return (
    <div>
      <Header title="Новая задача" />
      <div className="p-4">
        <div className="mb-3">
          <Link href="/tasks">
            <Button variant="ghost" size="sm"><ArrowLeft className="mr-2 h-4 w-4" /> Назад</Button>
          </Link>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {/* Левая колонка */}
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-sm font-semibold text-slate-500 uppercase tracking-wide">
                  Описание задачи
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-3">
                {/* Связать с заявкой */}
                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-500">Создать из заявки</Label>
                  {selectedRequest ? (
                    <div className="flex items-start justify-between gap-2 rounded-lg border border-orange-200 bg-orange-50 px-3 py-2">
                      <div className="flex items-start gap-2 min-w-0">
                        <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0 text-orange-500" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-800 truncate">
                            #{selectedRequest.number} — {selectedRequest.title}
                          </p>
                          {selectedRequest.client?.name && (
                            <p className="text-xs text-slate-500 truncate">{selectedRequest.client.name}</p>
                          )}
                          {selectedRequest.files?.length > 0 && (
                            <p className="mt-1 flex items-center gap-1 text-[11px] text-slate-400">
                              <Paperclip className="h-3 w-3" />
                              {selectedRequest.files.length} файл(ов) будет скопировано
                            </p>
                          )}
                        </div>
                      </div>
                      <button type="button" onClick={clearRequest} className="shrink-0 text-slate-400 hover:text-slate-600 mt-0.5">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div ref={req.ref} className="relative">
                      <Input
                        value={req.query}
                        onChange={(e) => req.setQuery(e.target.value)}
                        onFocus={() => req.results.length > 0 && req.setOpen(true)}
                        placeholder="Поиск по номеру или названию заявки..."
                        className="h-8 text-sm"
                      />
                      {req.loading && <Loader2 className="absolute right-2.5 top-2 h-4 w-4 animate-spin text-slate-300" />}
                      {req.open && req.results.length > 0 && (
                        <div className="absolute z-20 mt-1 w-full rounded-md border border-slate-200 bg-white shadow-lg max-h-52 overflow-y-auto">
                          {req.results.map((r: any) => (
                            <button key={r.id} type="button" onClick={() => pickRequest(r)}
                              className="flex w-full flex-col gap-0.5 px-3 py-2 text-left hover:bg-slate-50 border-b border-slate-50 last:border-0">
                              <span className="text-sm font-medium text-slate-800">
                                #{r.number} — {r.title}
                              </span>
                              {r.client?.name && <span className="text-xs text-slate-400">{r.client.name}</span>}
                            </button>
                          ))}
                        </div>
                      )}
                      {req.open && !req.loading && req.results.length === 0 && req.query.trim() && (
                        <div className="absolute z-20 mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-400 shadow-lg">
                          Заявки не найдены
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Разделитель */}
                <div className="border-t border-slate-100" />

                {/* Название */}
                <div className="space-y-1.5">
                  <Label className="text-sm">Название <span className="text-red-500">*</span></Label>
                  <Input {...register("title", { required: true })} placeholder="Что нужно сделать?" />
                </div>

                {/* Описание */}
                <div className="space-y-1.5">
                  <Label className="text-sm">Описание</Label>
                  <Textarea {...register("description")} rows={3} placeholder="Подробное описание задачи..." className="resize-none" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Правая колонка */}
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-sm font-semibold text-slate-500 uppercase tracking-wide">
                  Параметры
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-3">

                {/* Статус */}
                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-500">Статус</Label>
                  <Select value={status} onValueChange={(v) => setValue("status", v)}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {taskColumns.map((col) => (
                        <SelectItem key={col.key} value={col.key}>{col.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Приоритет */}
                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-500">Приоритет</Label>
                  <Select value={priority} onValueChange={(v) => setValue("priority", v)}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(PRIORITY_LABELS).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Цех */}
                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-500">Цех</Label>
                  <Select value={watch("workshopId") || "none"} onValueChange={(v) => setValue("workshopId", v === "none" ? "" : v)}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Без цеха" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Без цеха</SelectItem>
                      {workshops.map((w: any) => (
                        <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Срок */}
                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-500">Срок выполнения</Label>
                  <Input {...register("dueDate")} type="date" className="h-8 text-sm" />
                </div>

                {/* Контрагент с поиском */}
                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-500">Контрагент</Label>
                  {selectedClient ? (
                    <div className="flex items-start justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                      <div className="flex items-start gap-2 min-w-0">
                        <Building2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-800 leading-tight truncate">
                            {selectedClient.shortName || selectedClient.name}
                          </p>
                          {selectedClient.name !== (selectedClient.shortName || selectedClient.name) && (
                            <p className="text-[11px] text-slate-400 truncate leading-tight">{selectedClient.name}</p>
                          )}
                          {selectedClient.phone && (
                            <p className="mt-0.5 flex items-center gap-1 text-[11px] text-slate-400">
                              <Phone className="h-2.5 w-2.5" />{selectedClient.phone}
                            </p>
                          )}
                          {selectedClient.inn && (
                            <p className="text-[11px] text-slate-400">ИНН: {selectedClient.inn}</p>
                          )}
                        </div>
                      </div>
                      <button type="button" onClick={clearClient} className="shrink-0 text-slate-400 hover:text-slate-600 mt-0.5">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div ref={cli.ref} className="relative">
                      <Input
                        value={cli.query}
                        onChange={(e) => cli.setQuery(e.target.value)}
                        onFocus={() => cli.results.length > 0 && cli.setOpen(true)}
                        placeholder="Поиск контрагента..."
                        className="h-8 text-sm"
                      />
                      {cli.loading && <Loader2 className="absolute right-2.5 top-2 h-4 w-4 animate-spin text-slate-300" />}
                      {cli.open && cli.results.length > 0 && (
                        <div className="absolute z-20 mt-1 w-full rounded-md border border-slate-200 bg-white shadow-lg max-h-52 overflow-y-auto">
                          {cli.results.map((c: any) => (
                            <button key={c.id} type="button" onClick={() => pickClient(c)}
                              className="flex w-full flex-col gap-0.5 px-3 py-2 text-left hover:bg-slate-50 border-b border-slate-50 last:border-0">
                              <span className="text-sm font-medium text-slate-800 truncate">
                                {c.shortName || c.name}
                              </span>
                              {c.inn && <span className="text-xs text-slate-400">ИНН: {c.inn}</span>}
                              {c.phone && <span className="text-xs text-slate-400">{c.phone}</span>}
                            </button>
                          ))}
                        </div>
                      )}
                      {cli.open && !cli.loading && cli.results.length === 0 && cli.query.trim() && (
                        <div className="absolute z-20 mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-400 shadow-lg">
                          Контрагенты не найдены
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Ответственные */}
                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-500">Ответственные</Label>
                  <div className="rounded-md border border-slate-200 p-2 space-y-1.5">
                    <Input
                      value={assigneeQuery}
                      onChange={(e) => setAssigneeQuery(e.target.value)}
                      placeholder="Поиск..."
                      className="h-7 text-xs"
                    />
                    <div className="space-y-0.5 max-h-36 overflow-y-auto">
                      {(() => {
                        const q = assigneeQuery.trim().toLowerCase();
                        const filtered = users.filter((u: any) =>
                          !q ? true : u.name?.toLowerCase().includes(q) || (u.position ?? "").toLowerCase().includes(q)
                        );
                        if (users.length === 0) return <p className="px-1 py-1 text-xs text-slate-400">Нет исполнителей</p>;
                        if (filtered.length === 0) return <p className="px-1 py-1 text-xs text-slate-400">Ничего не найдено</p>;
                        return filtered.map((u: any) => {
                          const selected = (watch("assigneeIds") ?? []).includes(u.id);
                          return (
                            <label key={u.id} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm hover:bg-slate-50">
                              <input
                                type="checkbox"
                                checked={selected}
                                onChange={() => {
                                  const cur = watch("assigneeIds") ?? [];
                                  setValue("assigneeIds", selected ? cur.filter((id: string) => id !== u.id) : [...cur, u.id], { shouldDirty: true });
                                }}
                                className="h-3.5 w-3.5 rounded border-slate-300 accent-orange-500"
                              />
                              <span className="flex-1 min-w-0">
                                <span className="block truncate text-slate-800 text-xs">{u.name}</span>
                                {u.position && <span className="block truncate text-[10px] text-slate-400">{u.position}</span>}
                              </span>
                            </label>
                          );
                        });
                      })()}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Создать задачу
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
