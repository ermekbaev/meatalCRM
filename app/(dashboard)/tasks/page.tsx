"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { TASK_STATUS_LABELS, TASK_STATUS_COLORS, PRIORITY_LABELS, PRIORITY_COLORS, formatDate } from "@/lib/utils";
import { Plus, Search, Trash2, Eye, MessageSquare, CalendarClock } from "lucide-react";
import Link from "next/link";

export default function TasksPage() {
  const router = useRouter();
  const [tasks, setTasks] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");
  const [priority, setPriority] = useState("ALL");
  const [loading, setLoading] = useState(true);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (status !== "ALL") params.set("status", status);
    if (priority !== "ALL") params.set("priority", priority);
    const res = await fetch(`/api/tasks?${params}`);
    const data = await res.json();
    setTasks(data);
    setLoading(false);
  }, [search, status, priority]);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  const handleDelete = async (id: string) => {
    await fetch(`/api/tasks/${id}`, { method: "DELETE" });
    fetchTasks();
  };

  const statusGroups: Record<string, any[]> = {
    TODO:             tasks.filter((t) => t.status === "TODO"),
    PENDING_APPROVAL: tasks.filter((t) => t.status === "PENDING_APPROVAL"),
    IN_PROGRESS:      tasks.filter((t) => t.status === "IN_PROGRESS"),
    DONE:             tasks.filter((t) => t.status === "DONE"),
    CANCELLED:        tasks.filter((t) => t.status === "CANCELLED"),
  };

  return (
    <div>
      <Header title="Задачи" />
      <div className="p-4 lg:p-6 space-y-4">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input placeholder="Поиск задач..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-40"><SelectValue placeholder="Статус" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Все статусы</SelectItem>
              {Object.entries(TASK_STATUS_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={priority} onValueChange={setPriority}>
            <SelectTrigger className="w-36"><SelectValue placeholder="Приоритет" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Все</SelectItem>
              {Object.entries(PRIORITY_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button className="ml-auto" onClick={() => router.push("/tasks/new")}>
            <Plus className="mr-2 h-4 w-4" /> Создать задачу
          </Button>
        </div>

        {loading ? (
          <div className="flex h-40 items-center justify-center text-slate-400 text-sm">Загрузка...</div>
        ) : tasks.length === 0 ? (
          <div className="flex h-40 flex-col items-center justify-center gap-3 text-slate-400">
            <p className="text-sm">Задач пока нет</p>
            <Button variant="outline" size="sm" onClick={() => router.push("/tasks/new")}>
              <Plus className="mr-1 h-4 w-4" /> Создать первую задачу
            </Button>
          </div>
        ) : status === "ALL" ? (
          /* Kanban-style grouped view */
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
            {Object.entries(statusGroups).map(([st, items]) => (
              <div key={st}>
                <div className="mb-3 flex items-center justify-between">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${TASK_STATUS_COLORS[st]}`}>
                    {TASK_STATUS_LABELS[st]}
                  </span>
                  <span className="text-xs text-slate-400">{items.length}</span>
                </div>
                <div className="space-y-2">
                  {items.map((task) => (
                    <TaskCard key={task.id} task={task} onDelete={handleDelete} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Filtered list view */
          <div className="space-y-2">
            {tasks.map((task) => (
              <TaskCard key={task.id} task={task} onDelete={handleDelete} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function TaskCard({ task, onDelete }: { task: any; onDelete: (id: string) => void }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between gap-2 mb-2">
        <Link href={`/tasks/${task.id}`} className="text-sm font-medium text-slate-800 hover:text-slate-600 leading-tight">
          {task.title}
        </Link>
        <div className="flex gap-1 shrink-0">
          <Link href={`/tasks/${task.id}`}>
            <button className="text-slate-300 hover:text-slate-600 transition-colors p-0.5">
              <Eye className="h-3.5 w-3.5" />
            </button>
          </Link>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button className="text-slate-300 hover:text-red-500 transition-colors p-0.5">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Удалить задачу?</AlertDialogTitle>
                <AlertDialogDescription>Это действие нельзя отменить.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Отмена</AlertDialogCancel>
                <AlertDialogAction onClick={() => onDelete(task.id)} className="bg-red-600 hover:bg-red-700">Удалить</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 mb-2">
        <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${PRIORITY_COLORS[task.priority]}`}>
          {PRIORITY_LABELS[task.priority]}
        </span>
      </div>

      <div className="space-y-1 text-[11px] text-slate-400">
        {task.assignee && (
          <p>👤 {task.assignee.name}</p>
        )}
        {task.client && (
          <p>🏢 {task.client.shortName || task.client.name}</p>
        )}
        {task.dueDate && (
          <p className={new Date(task.dueDate) < new Date() && task.status !== "DONE" ? "text-red-500" : ""}>
            📅 до {formatDate(task.dueDate)}
          </p>
        )}
        {task._count?.comments > 0 && (
          <p>💬 {task._count.comments}</p>
        )}
      </div>
    </div>
  );
}
