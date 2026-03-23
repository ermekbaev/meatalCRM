"use client";
import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TASK_STATUS_LABELS, TASK_STATUS_COLORS, PRIORITY_LABELS, PRIORITY_COLORS, formatDate, formatDateTime } from "@/lib/utils";
import { ArrowLeft, Send, Loader2, Clock } from "lucide-react";
import Link from "next/link";

export default function TaskDetailPage() {
  const params = useParams();
  const [task, setTask] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [comment, setComment] = useState("");
  const [sendingComment, setSendingComment] = useState(false);
  const [users, setUsers] = useState<any[]>([]);

  const fetchTask = useCallback(async () => {
    const res = await fetch(`/api/tasks/${params.id}`);
    const data = await res.json();
    setTask(data);
    setLoading(false);
  }, [params.id]);

  useEffect(() => {
    fetchTask();
    fetch("/api/users").then((r) => r.json()).then(setUsers).catch(() => {});
  }, [fetchTask]);

  const updateField = async (field: string, value: any) => {
    setSaving(true);
    const res = await fetch(`/api/tasks/${params.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...task, [field]: value }),
    });
    const updated = await res.json();
    setTask((prev: any) => ({ ...prev, ...updated }));
    setSaving(false);
  };

  const sendComment = async () => {
    if (!comment.trim()) return;
    setSendingComment(true);
    const res = await fetch(`/api/tasks/${params.id}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: comment }),
    });
    const newComment = await res.json();
    setTask((prev: any) => ({ ...prev, comments: [...(prev.comments ?? []), newComment] }));
    setComment("");
    setSendingComment(false);
  };

  if (loading) {
    return (
      <div>
        <Header title="Задача" />
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      </div>
    );
  }

  if (!task) return null;

  return (
    <div>
      <Header title={task.title} />
      <div className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <Link href="/tasks">
            <Button variant="ghost" size="sm"><ArrowLeft className="mr-2 h-4 w-4" /> Назад</Button>
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
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <h2 className="text-xl font-semibold text-gray-900">{task.title}</h2>
                    {task.client && (
                      <p className="mt-1 text-sm text-gray-500">
                        Контрагент:{" "}
                        <Link href={`/clients/${task.client.id}`} className="text-blue-600 hover:underline">
                          {task.client.name}
                        </Link>
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2 flex-wrap justify-end shrink-0">
                    <span className={`rounded-full px-3 py-1 text-sm font-medium ${TASK_STATUS_COLORS[task.status]}`}>
                      {TASK_STATUS_LABELS[task.status]}
                    </span>
                    <span className={`rounded-full px-3 py-1 text-sm font-medium ${PRIORITY_COLORS[task.priority]}`}>
                      {PRIORITY_LABELS[task.priority]}
                    </span>
                  </div>
                </div>
              </CardHeader>
              {task.description && (
                <CardContent>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{task.description}</p>
                </CardContent>
              )}
            </Card>

            {/* Комментарии */}
            <Card>
              <CardHeader><CardTitle className="text-base">Комментарии</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3 max-h-80 overflow-y-auto">
                  {(!task.comments || task.comments.length === 0) && (
                    <p className="text-sm text-gray-400">Нет комментариев</p>
                  )}
                  {task.comments?.map((c: any) => (
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
          </div>

          {/* Sidebar */}
          <div>
            <Card>
              <CardHeader><CardTitle className="text-base">Параметры</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <p className="text-xs font-medium text-gray-500">Статус</p>
                  <Select value={task.status} onValueChange={(v) => updateField("status", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(TASK_STATUS_LABELS).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-medium text-gray-500">Приоритет</p>
                  <Select value={task.priority} onValueChange={(v) => updateField("priority", v)}>
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
                    value={task.assigneeId ?? "none"}
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

                {task.dueDate && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-gray-500">Срок</p>
                    <p className={`text-sm font-medium ${new Date(task.dueDate) < new Date() && task.status !== "DONE" ? "text-red-600" : "text-gray-700"}`}>
                      {formatDate(task.dueDate)}
                      {new Date(task.dueDate) < new Date() && task.status !== "DONE" && " — просрочено"}
                    </p>
                  </div>
                )}

                <div className="pt-2 space-y-1.5 border-t border-gray-100 text-xs text-gray-400">
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-3 w-3" />
                    Создана: {formatDate(task.createdAt)}
                  </div>
                  {task.createdBy && (
                    <div className="flex items-center gap-1.5">
                      <span className="h-3 w-3 inline-block" />
                      Создал: {task.createdBy.name}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
