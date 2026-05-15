"use client";
import { useEffect, useState } from "react";
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
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";

export default function NewTaskPage() {
  const router = useRouter();
  const [users, setUsers] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [workshops, setWorkshops] = useState<any[]>([]);
  const [taskColumns, setTaskColumns] = useState<Array<{ key: string; name: string }>>([]);
  const [assigneeQuery, setAssigneeQuery] = useState("");

  const { register, handleSubmit, setValue, watch, formState: { isSubmitting } } = useForm<{
    title: string;
    description: string;
    status: string;
    priority: string;
    dueDate: string;
    assigneeIds: string[];
    clientId: string;
    workshopId: string;
  }>({
    defaultValues: {
      title: "",
      description: "",
      status: "TODO",
      priority: "MEDIUM",
      dueDate: "",
      assigneeIds: [],
      clientId: "",
      workshopId: "",
    },
  });

  useEffect(() => {
    Promise.all([
      fetch("/api/users?role=FOREMAN&role=ENGINEER&role=CONTRACTOR").then((r) => r.json()).catch(() => []),
      fetch("/api/clients").then((r) => r.json()),
      fetch("/api/workshops").then((r) => r.json()).catch(() => []),
      fetch("/api/task-columns").then((r) => r.json()).catch(() => []),
    ]).then(([u, c, w, cols]) => {
      setUsers(u);
      setClients(c);
      setWorkshops(Array.isArray(w) ? w.filter((x: any) => !x.isVirtual) : []);
      setTaskColumns(Array.isArray(cols) ? cols : []);
    });
  }, []);

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
      }),
    });
    if (!res.ok) {
      alert("Ошибка при создании задачи. Попробуйте ещё раз.");
      return;
    }
    router.push("/tasks");
  }

  const status = watch("status");
  const priority = watch("priority");

  return (
    <div>
      <Header title="Новая задача" />
      <div className="p-6">
        <div className="mb-4">
          <Link href="/tasks">
            <Button variant="ghost" size="sm"><ArrowLeft className="mr-2 h-4 w-4" /> Назад</Button>
          </Link>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader><CardTitle className="text-base">Описание задачи</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Название *</Label>
                  <Input {...register("title", { required: true })} placeholder="Что нужно сделать?" />
                </div>
                <div className="space-y-2">
                  <Label>Описание</Label>
                  <Textarea {...register("description")} rows={4} placeholder="Подробное описание задачи..." />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader><CardTitle className="text-base">Параметры</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Статус</Label>
                  <Select value={status} onValueChange={(v) => setValue("status", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {taskColumns.map((col) => (
                        <SelectItem key={col.key} value={col.key}>{col.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Приоритет</Label>
                  <Select value={priority} onValueChange={(v) => setValue("priority", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(PRIORITY_LABELS).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Ответственные</Label>
                  <div className="rounded-md border border-slate-200 p-2 space-y-2">
                    <Input
                      value={assigneeQuery}
                      onChange={(e) => setAssigneeQuery(e.target.value)}
                      placeholder="Поиск..."
                      className="h-7 text-xs"
                    />
                    <div className="space-y-1 max-h-44 overflow-y-auto">
                      {(() => {
                        const q = assigneeQuery.trim().toLowerCase();
                        const filtered = users.filter((u: any) =>
                          !q
                            ? true
                            : u.name?.toLowerCase().includes(q)
                              || (u.position ?? "").toLowerCase().includes(q)
                        );
                        if (users.length === 0) {
                          return <p className="px-1 py-1 text-xs text-slate-400">Нет доступных мастеров</p>;
                        }
                        if (filtered.length === 0) {
                          return <p className="px-1 py-1 text-xs text-slate-400">Ничего не найдено</p>;
                        }
                        return filtered.map((u: any) => {
                          const selected = (watch("assigneeIds") ?? []).includes(u.id);
                          return (
                            <label
                              key={u.id}
                              className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-slate-50"
                            >
                              <input
                                type="checkbox"
                                checked={selected}
                                onChange={() => {
                                  const current = watch("assigneeIds") ?? [];
                                  setValue(
                                    "assigneeIds",
                                    selected ? current.filter((id: string) => id !== u.id) : [...current, u.id],
                                    { shouldDirty: true },
                                  );
                                }}
                                className="h-4 w-4 rounded border-slate-300 accent-orange-500"
                              />
                              <span className="flex-1 min-w-0">
                                <span className="block truncate text-slate-800">{u.name}</span>
                                {u.position && (
                                  <span className="block truncate text-[10px] text-slate-400">{u.position}</span>
                                )}
                              </span>
                            </label>
                          );
                        });
                      })()}
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Цех</Label>
                  <Select value={watch("workshopId") || "none"} onValueChange={(v) => setValue("workshopId", v === "none" ? "" : v)}>
                    <SelectTrigger><SelectValue placeholder="Без цеха" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Без цеха</SelectItem>
                      {workshops.map((w: any) => (
                        <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Срок выполнения</Label>
                  <Input {...register("dueDate")} type="date" />
                </div>
                <div className="space-y-2">
                  <Label>Контрагент</Label>
                  <Select value={watch("clientId")} onValueChange={(v) => setValue("clientId", v)}>
                    <SelectTrigger><SelectValue placeholder="Не привязано" /></SelectTrigger>
                    <SelectContent>
                      {clients.map((c: any) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
