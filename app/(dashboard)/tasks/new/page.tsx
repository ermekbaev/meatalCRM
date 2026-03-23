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
import { TASK_STATUS_LABELS, PRIORITY_LABELS } from "@/lib/utils";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";

export default function NewTaskPage() {
  const router = useRouter();
  const [users, setUsers] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);

  const { register, handleSubmit, setValue, watch, formState: { isSubmitting } } = useForm({
    defaultValues: {
      title: "",
      description: "",
      status: "TODO",
      priority: "MEDIUM",
      dueDate: "",
      assigneeId: "",
      clientId: "",
    },
  });

  useEffect(() => {
    Promise.all([
      fetch("/api/users").then((r) => r.json()).catch(() => []),
      fetch("/api/clients").then((r) => r.json()),
    ]).then(([u, c]) => { setUsers(u); setClients(c); });
  }, []);

  async function onSubmit(data: any) {
    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...data,
        assigneeId: data.assigneeId || null,
        clientId: data.clientId || null,
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
                      {Object.entries(TASK_STATUS_LABELS).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
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
                  <Label>Ответственный</Label>
                  <Select value={watch("assigneeId")} onValueChange={(v) => setValue("assigneeId", v)}>
                    <SelectTrigger><SelectValue placeholder="Не назначен" /></SelectTrigger>
                    <SelectContent>
                      {users.map((u: any) => (
                        <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
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
