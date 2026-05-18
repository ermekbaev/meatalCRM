"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { StatusMultiSelect } from "@/components/ui/status-multi-select";
import { PRIORITY_LABELS, PRIORITY_COLORS, TASK_PRODUCTION_FIELDS, formatDate, hexToBadgeStyle } from "@/lib/utils";
import { Building2, Check, Factory, Loader2, Plus, Printer, Search, Settings, Trash2, Eye, Users, GripVertical, X, Columns3, Pencil } from "lucide-react";
import Link from "next/link";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";

type Workshop = {
  id: string;
  name: string;
  order: number;
  isVirtual?: boolean;
  members?: Array<{ id: string; name: string; role: string; position?: string | null }>;
  _count?: { tasks: number };
};

type TaskColumn = {
  id: string;
  key: string;
  name: string;
  color: string;
  order: number;
  isSystem: boolean;
};

export default function TasksPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const role = (session?.user as any)?.role;
  const userId = (session?.user as any)?.id as string | undefined;
  const isAdmin = role === "ADMIN";
  const isForeman = role === "FOREMAN";
  const isContractor = role === "CONTRACTOR";
  // FOREMAN и CONTRACTOR видят только задачи, где они среди ответственных — UI у них одинаковый.
  const isAssigneeView = isForeman || isContractor;
  const canManageTasks = role === "ADMIN" || role === "MANAGER";
  const [tasks, setTasks] = useState<any[]>([]);
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [columns, setColumns] = useState<TaskColumn[]>([]);
  const [columnsOpen, setColumnsOpen] = useState(false);
  const [newColumnName, setNewColumnName] = useState("");
  const [newColumnColor, setNewColumnColor] = useState("#94a3b8");
  const [savingColumn, setSavingColumn] = useState(false);
  const [editingColumnId, setEditingColumnId] = useState<string | null>(null);
  const [editColumnDraft, setEditColumnDraft] = useState<{ name: string; color: string }>({ name: "", color: "" });
  const [users, setUsers] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [statuses, setStatuses] = useState<string[]>([]);
  const [priority, setPriority] = useState("ALL");
  const [activeWorkshopId, setActiveWorkshopId] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [workshopsOpen, setWorkshopsOpen] = useState(false);
  const [newWorkshopName, setNewWorkshopName] = useState("");
  const [savingWorkshop, setSavingWorkshop] = useState(false);
  const [activeDragTask, setActiveDragTask] = useState<any>(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [printingBulk, setPrintingBulk] = useState(false);
  // Бейджи «новых» задач на табах цехов. Per-tab timestamp последнего просмотра.
  const [lastSeen, setLastSeen] = useState<Record<string, number>>({});
  const [seenLoaded, setSeenLoaded] = useState(false);
  const seenStorageKey = userId ? `tasks-tabs-seen:${userId}` : null;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (statuses.length) params.set("status", statuses.join(","));
    if (priority !== "ALL") params.set("priority", priority);
    // Для FOREMAN/CONTRACTOR фильтр по цеху делаем на клиенте, чтобы счётчики на табах оставались валидными
    if (!isAssigneeView && activeWorkshopId !== "ALL") params.set("workshopId", activeWorkshopId);
    const res = await fetch(`/api/tasks?${params}`);
    const data = await res.json();
    setTasks(data);
    setLoading(false);
  }, [search, statuses, priority, activeWorkshopId, isAssigneeView]);

  const fetchWorkshops = useCallback(async () => {
    const data = await fetch("/api/workshops").then((r) => r.json()).catch(() => []);
    setWorkshops(Array.isArray(data) ? data : []);
  }, []);

  const fetchColumns = useCallback(async () => {
    const data = await fetch("/api/task-columns").then((r) => r.json()).catch(() => []);
    setColumns(Array.isArray(data) ? data : []);
  }, []);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);
  useEffect(() => {
    fetchWorkshops();
    fetchColumns();
    fetch("/api/users").then((r) => r.json()).then((data) => setUsers(Array.isArray(data) ? data : [])).catch(() => {});
  }, [fetchWorkshops, fetchColumns]);

  // Загрузка «прочитанности» табов из localStorage
  useEffect(() => {
    if (!seenStorageKey) return;
    try {
      const raw = localStorage.getItem(seenStorageKey);
      if (raw) setLastSeen(JSON.parse(raw));
    } catch {}
    setSeenLoaded(true);
  }, [seenStorageKey]);

  // Сохранение
  useEffect(() => {
    if (!seenStorageKey || !seenLoaded) return;
    try {
      localStorage.setItem(seenStorageKey, JSON.stringify(lastSeen));
    } catch {}
  }, [seenStorageKey, seenLoaded, lastSeen]);

  // Первый визит: проставляем baseline = now, чтобы существующие задачи не светились как новые
  useEffect(() => {
    if (!seenLoaded || workshops.length === 0) return;
    if (Object.keys(lastSeen).length > 0) return;
    const now = Date.now();
    const initial: Record<string, number> = { none: now };
    for (const w of workshops) initial[w.id] = now;
    setLastSeen(initial);
  }, [seenLoaded, workshops, lastSeen]);

  const markTabSeen = useCallback((tabId: string) => {
    const now = Date.now();
    setLastSeen((prev) => {
      if (tabId === "ALL") {
        const next: Record<string, number> = { ...prev, none: now };
        for (const w of workshops) next[w.id] = now;
        return next;
      }
      return { ...prev, [tabId]: now };
    });
  }, [workshops]);

  // Сколько «новых» задач на каждом табе
  const newByTab = useMemo(() => {
    const result: Record<string, number> = { none: 0 };
    for (const w of workshops) result[w.id] = 0;
    for (const t of tasks) {
      const key = (t.workshopId as string | null) ?? "none";
      const seen = lastSeen[key] ?? 0;
      if (new Date(t.createdAt).getTime() > seen) {
        result[key] = (result[key] ?? 0) + 1;
      }
    }
    let all = 0;
    for (const k of Object.keys(result)) all += result[k];
    result.ALL = all;
    return result;
  }, [tasks, workshops, lastSeen]);

  const handleDelete = async (id: string) => {
    await fetch(`/api/tasks/${id}`, { method: "DELETE" });
    fetchTasks();
  };

  const createWorkshop = async () => {
    const name = newWorkshopName.trim();
    if (!name) return;
    setSavingWorkshop(true);
    const res = await fetch("/api/workshops", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, order: workshops.length }),
    });
    if (res.ok) {
      setNewWorkshopName("");
      await fetchWorkshops();
    }
    setSavingWorkshop(false);
  };

  const updateWorkshopMembers = async (workshop: Workshop, userId: string, checked: boolean) => {
    const currentIds = workshop.members?.map((m) => m.id) ?? [];
    const memberIds = checked ? [...currentIds, userId] : currentIds.filter((id) => id !== userId);
    const res = await fetch(`/api/workshops/${workshop.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memberIds }),
    });
    if (res.ok) {
      const updated = await res.json();
      setWorkshops((prev) => prev.map((w) => w.id === workshop.id ? updated : w));
    }
  };

  const createColumn = async () => {
    const name = newColumnName.trim();
    if (!name) return;
    setSavingColumn(true);
    const res = await fetch("/api/task-columns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, color: newColumnColor }),
    });
    if (res.ok) {
      setNewColumnName("");
      setNewColumnColor("#94a3b8");
      await fetchColumns();
    }
    setSavingColumn(false);
  };

  const startEditColumn = (col: TaskColumn) => {
    setEditingColumnId(col.id);
    setEditColumnDraft({ name: col.name, color: col.color });
  };

  const saveEditColumn = async () => {
    if (!editingColumnId) return;
    const name = editColumnDraft.name.trim();
    if (!name) return;
    const res = await fetch(`/api/task-columns/${editingColumnId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, color: editColumnDraft.color }),
    });
    if (res.ok) {
      setEditingColumnId(null);
      await fetchColumns();
    }
  };

  const deleteColumn = async (id: string) => {
    const res = await fetch(`/api/task-columns/${id}`, { method: "DELETE" });
    if (res.ok) {
      await fetchColumns();
      fetchTasks();
    }
  };

  const deleteWorkshop = async (id: string) => {
    const res = await fetch(`/api/workshops/${id}`, { method: "DELETE" });
    if (res.ok) {
      if (activeWorkshopId === id) setActiveWorkshopId("ALL");
      await fetchWorkshops();
      fetchTasks();
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const exitSelectMode = () => {
    setSelectMode(false);
    setSelectedIds(new Set());
  };

  const printSelected = async () => {
    if (selectedIds.size === 0) return;
    setPrintingBulk(true);
    try {
      const ids = Array.from(selectedIds);
      const [company, ...fullTasks] = await Promise.all([
        fetch("/api/settings/company").then((r) => r.ok ? r.json() : null).catch(() => null),
        ...ids.map((id) => fetch(`/api/tasks/${id}`).then((r) => r.ok ? r.json() : null).catch(() => null)),
      ]);
      const tasksToPrint = fullTasks.filter(Boolean);
      if (tasksToPrint.length === 0) return;
      const { generateProductionBulkPDF } = await import("@/lib/production-pdf");
      await generateProductionBulkPDF(tasksToPrint, company);
      exitSelectMode();
    } finally {
      setPrintingBulk(false);
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    const task = tasks.find((t) => t.id === event.active.id);
    if (task) setActiveDragTask(task);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveDragTask(null);
    const { active, over } = event;
    if (!over) return;

    const taskId = String(active.id);
    const newStatus = String(over.id);
    const task = tasks.find((t) => t.id === taskId);
    if (!task || task.status === newStatus) return;

    const prevStatus = task.status;
    setTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, status: newStatus } : t));

    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...task, status: newStatus }),
      });
      if (!res.ok) throw new Error("status update failed");
    } catch {
      setTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, status: prevStatus } : t));
    }
  };

  const displayTasks = !isAssigneeView || activeWorkshopId === "ALL"
    ? tasks
    : activeWorkshopId === "none"
      ? tasks.filter((t) => !t.workshopId)
      : tasks.filter((t) => t.workshopId === activeWorkshopId);

  const visibleColumns = statuses.length
    ? columns.filter((c) => statuses.includes(c.key))
    : columns;
  const statusGroups: Array<{ column: TaskColumn; items: any[] }> = visibleColumns.map((col) => ({
    column: col,
    items: displayTasks.filter((t) => t.status === col.key),
  }));

  return (
    <div>
      <Header title="Задачи" />
      <div className="p-4 lg:p-6 space-y-4">
        <div className="flex items-center gap-2 overflow-x-auto border-b border-slate-200 pb-2">
          {(() => {
            const taskCountByWs = new Map<string, number>();
            let noWsCount = 0;
            for (const t of tasks) {
              if (t.workshopId) taskCountByWs.set(t.workshopId, (taskCountByWs.get(t.workshopId) ?? 0) + 1);
              else noWsCount++;
            }
            const realWorkshops = workshops.filter((w) => !w.isVirtual);
            const visibleWorkshops = isAssigneeView
              ? realWorkshops.filter((w) => (taskCountByWs.get(w.id) ?? 0) > 0)
              : realWorkshops;
            const showNoWsTab = !isAssigneeView || noWsCount > 0;
            const showAllTab = !isAssigneeView || (visibleWorkshops.length + (showNoWsTab ? 1 : 0)) > 1;
            return (
              <>
                {showAllTab && (
                  <button
                    type="button"
                    onClick={() => { markTabSeen("ALL"); setActiveWorkshopId("ALL"); }}
                    className={`inline-flex h-8 shrink-0 items-center gap-2 border-b-2 px-3 text-sm font-medium transition-colors ${
                      activeWorkshopId === "ALL"
                        ? "border-orange-500 text-orange-600"
                        : "border-transparent text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    <Building2 className="h-4 w-4" /> Все
                    <NewBadge count={newByTab.ALL ?? 0} />
                  </button>
                )}
                {showNoWsTab && (
                  <button
                    type="button"
                    onClick={() => { markTabSeen("none"); setActiveWorkshopId("none"); }}
                    className={`inline-flex h-8 shrink-0 items-center border-b-2 px-3 text-sm font-medium transition-colors ${
                      activeWorkshopId === "none"
                        ? "border-orange-500 text-orange-600"
                        : "border-transparent text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    Без цеха
                    {isAssigneeView && noWsCount > 0 && (
                      <span className="ml-1.5 rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500">
                        {noWsCount}
                      </span>
                    )}
                    <NewBadge count={newByTab.none ?? 0} />
                  </button>
                )}
                {visibleWorkshops.map((workshop) => (
                  <button
                    key={workshop.id}
                    type="button"
                    onClick={() => { markTabSeen(workshop.id); setActiveWorkshopId(workshop.id); }}
                    className={`inline-flex h-8 shrink-0 items-center gap-2 border-b-2 px-3 text-sm font-medium transition-colors ${
                      activeWorkshopId === workshop.id
                        ? "border-orange-500 text-orange-600"
                        : "border-transparent text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    {workshop.name}
                    <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500">
                      {isAssigneeView ? (taskCountByWs.get(workshop.id) ?? 0) : (workshop._count?.tasks ?? 0)}
                    </span>
                    <NewBadge count={newByTab[workshop.id] ?? 0} />
                  </button>
                ))}
              </>
            );
          })()}
          {isAdmin && (
            <div className="ml-auto flex shrink-0 items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setColumnsOpen(true)}
                title="Управление колонками"
              >
                <Columns3 className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setWorkshopsOpen(true)}
                title="Управление цехами"
              >
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="relative w-full sm:flex-1 sm:min-w-[200px] sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input placeholder="Поиск задач..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <StatusMultiSelect
            value={statuses}
            onChange={setStatuses}
            options={columns.map((col) => ({ key: col.key, label: col.name }))}
          />
          <Select value={priority} onValueChange={setPriority}>
            <SelectTrigger className="flex-1 sm:flex-none sm:w-36 min-w-0"><SelectValue placeholder="Приоритет" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Все</SelectItem>
              {Object.entries(PRIORITY_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex w-full sm:w-auto sm:ml-auto items-center gap-2">
            {selectMode ? (
              <>
                <span className="text-xs text-slate-500">
                  Выбрано: {selectedIds.size}
                </span>
                <Button
                  variant="outline"
                  className="flex-1 sm:flex-none"
                  onClick={printSelected}
                  disabled={printingBulk || selectedIds.size === 0}
                >
                  {printingBulk
                    ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    : <Printer className="mr-2 h-4 w-4" />
                  }
                  Печать ({selectedIds.size})
                </Button>
                <Button variant="ghost" size="icon" onClick={exitSelectMode} title="Отменить выбор">
                  <X className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" className="flex-1 sm:flex-none" onClick={() => setSelectMode(true)}>
                  <Printer className="mr-2 h-4 w-4" />
                  <span className="hidden sm:inline">Выбрать для печати</span>
                  <span className="sm:hidden">Печать</span>
                </Button>
                {canManageTasks && (
                  <Button className="flex-1 sm:flex-none" onClick={() => router.push("/tasks/new")}>
                    <Plus className="mr-2 h-4 w-4" />
                    <span className="hidden sm:inline">Создать задачу</span>
                    <span className="sm:hidden">Создать</span>
                  </Button>
                )}
              </>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex h-40 items-center justify-center text-slate-400 text-sm">Загрузка...</div>
        ) : displayTasks.length === 0 ? (
          <div className="flex h-40 flex-col items-center justify-center gap-3 text-slate-400">
            <p className="text-sm">Задач пока нет</p>
            {canManageTasks && (
              <Button variant="outline" size="sm" onClick={() => router.push("/tasks/new")}>
                <Plus className="mr-1 h-4 w-4" /> Создать первую задачу
              </Button>
            )}
          </div>
        ) : (
          <>
            {/* Mobile: grouped list, no DnD */}
            <div className="md:hidden space-y-5">
              {statusGroups.map(({ column, items }) => (
                items.length === 0 ? null : (
                  <div key={column.id}>
                    <div className="mb-2 flex items-center justify-between px-1">
                      <span
                        className="rounded-full px-2.5 py-0.5 text-xs font-medium"
                        style={hexToBadgeStyle(column.color)}
                      >
                        {column.name}
                      </span>
                      <span className="text-xs text-slate-400">{items.length}</span>
                    </div>
                    <div className="space-y-2">
                      {items.map((task) => (
                        <TaskCard
                          key={task.id}
                          task={task}
                          onDelete={handleDelete}
                          selectMode={selectMode}
                          selected={selectedIds.has(task.id)}
                          onToggleSelect={toggleSelect}
                          canDelete={canManageTasks}
                        />
                      ))}
                    </div>
                  </div>
                )
              ))}
            </div>

            {/* Desktop: Kanban with DnD */}
            <div className="hidden md:block">
              <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
                <div
                  className="grid gap-6"
                  style={{ gridTemplateColumns: `repeat(${Math.max(statusGroups.length, 1)}, minmax(0, 1fr))` }}
                >
                  {statusGroups.map(({ column, items }) => (
                    <KanbanColumn key={column.id} column={column} count={items.length}>
                      {items.map((task) => (
                        <DraggableTaskCard
                          key={task.id}
                          task={task}
                          onDelete={handleDelete}
                          selectMode={selectMode}
                          selected={selectedIds.has(task.id)}
                          onToggleSelect={toggleSelect}
                          canDelete={canManageTasks}
                          canDrag={canManageTasks || isForeman}
                        />
                      ))}
                    </KanbanColumn>
                  ))}
                </div>
                <DragOverlay>
                  {activeDragTask ? (
                    <div className="rotate-2 opacity-90">
                      <TaskCard task={activeDragTask} onDelete={() => {}} />
                    </div>
                  ) : null}
                </DragOverlay>
              </DndContext>
            </div>
          </>
        )}
      </div>

      <Dialog open={workshopsOpen} onOpenChange={(open) => setWorkshopsOpen(open)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Управление цехами</DialogTitle>
          </DialogHeader>

          <div className="space-y-5">
            <div className="flex flex-wrap gap-2">
              <Input
                value={newWorkshopName}
                onChange={(e) => setNewWorkshopName(e.target.value)}
                placeholder="Название цеха"
                className="flex-1 min-w-[220px]"
                onKeyDown={(e) => { if (e.key === "Enter") createWorkshop(); }}
              />
              <Button onClick={createWorkshop} disabled={savingWorkshop || !newWorkshopName.trim()}>
                {savingWorkshop ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                Создать
              </Button>
            </div>

            <div className="space-y-3">
              {workshops.length === 0 && (
                <div className="rounded-lg border border-dashed border-slate-200 p-6 text-center text-sm text-slate-400">
                  Цеха ещё не созданы
                </div>
              )}
              {workshops.map((workshop) => (
                <div
                  key={workshop.id}
                  className={`rounded-lg border p-4 ${workshop.isVirtual ? "border-dashed border-slate-300 bg-slate-50/40" : "border-slate-200"}`}
                >
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                        {workshop.name}
                        {workshop.isVirtual && (
                          <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] uppercase tracking-wide text-slate-600">
                            виртуальный
                          </span>
                        )}
                      </h3>
                      <p className="mt-1 flex items-center gap-1 text-xs text-slate-400">
                        <Users className="h-3 w-3" />
                        {workshop.members?.length ?? 0} участников
                        {workshop.isVirtual
                          ? " · доступ к задачам без цеха"
                          : ` · ${workshop._count?.tasks ?? 0} задач`}
                      </p>
                    </div>
                    {!workshop.isVirtual && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="text-slate-400 hover:text-red-500">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Удалить цех?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Задачи останутся в системе, но будут отвязаны от этого цеха.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Отмена</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteWorkshop(workshop.id)} className="bg-red-600 hover:bg-red-700">
                              Удалить
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>

                  <div className="grid gap-2 sm:grid-cols-2">
                    {users.map((user) => {
                      const checked = Boolean(workshop.members?.some((member) => member.id === user.id));
                      return (
                        <Label
                          key={user.id}
                          className="flex cursor-pointer items-center gap-2 rounded-md border border-slate-100 px-3 py-2 text-sm hover:bg-slate-50"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => updateWorkshopMembers(workshop, user.id, e.target.checked)}
                            className="h-4 w-4 rounded border-slate-300"
                          />
                          <span className="flex-1 min-w-0">
                            <span className="block truncate text-slate-800">{user.name}</span>
                            {user.position && <span className="block truncate text-xs text-slate-400">{user.position}</span>}
                          </span>
                          {checked && <Check className="h-4 w-4 text-green-600" />}
                        </Label>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setWorkshopsOpen(false)}>Закрыть</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={columnsOpen} onOpenChange={(open) => { setColumnsOpen(open); if (!open) setEditingColumnId(null); }}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Управление колонками</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Input
                value={newColumnName}
                onChange={(e) => setNewColumnName(e.target.value)}
                placeholder="Название колонки"
                className="flex-1 min-w-[180px]"
                onKeyDown={(e) => { if (e.key === "Enter") createColumn(); }}
              />
              <label className="flex items-center gap-2 text-xs text-slate-500">
                <input
                  type="color"
                  value={newColumnColor}
                  onChange={(e) => setNewColumnColor(e.target.value)}
                  className="h-8 w-10 cursor-pointer rounded border border-slate-200 bg-white p-0.5"
                />
              </label>
              <Button onClick={createColumn} disabled={savingColumn || !newColumnName.trim()}>
                {savingColumn ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                Добавить
              </Button>
            </div>

            <div className="space-y-2">
              {columns.length === 0 && (
                <div className="rounded-lg border border-dashed border-slate-200 p-6 text-center text-sm text-slate-400">
                  Колонок пока нет
                </div>
              )}
              {columns.map((col) => {
                const isEditing = editingColumnId === col.id;
                return (
                  <div key={col.id} className="flex items-center gap-2 rounded-lg border border-slate-200 p-3">
                    {isEditing ? (
                      <>
                        <input
                          type="color"
                          value={editColumnDraft.color}
                          onChange={(e) => setEditColumnDraft((p) => ({ ...p, color: e.target.value }))}
                          className="h-8 w-10 shrink-0 cursor-pointer rounded border border-slate-200 bg-white p-0.5"
                        />
                        <Input
                          value={editColumnDraft.name}
                          onChange={(e) => setEditColumnDraft((p) => ({ ...p, name: e.target.value }))}
                          className="flex-1 h-8"
                          onKeyDown={(e) => { if (e.key === "Enter") saveEditColumn(); }}
                          autoFocus
                        />
                        <Button size="sm" onClick={saveEditColumn} className="h-8">Сохранить</Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditingColumnId(null)} className="h-8">
                          <X className="h-4 w-4" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <span
                          className="rounded-full px-2.5 py-0.5 text-xs font-medium"
                          style={hexToBadgeStyle(col.color)}
                        >
                          {col.name}
                        </span>
                        {col.isSystem && (
                          <span className="text-[10px] uppercase tracking-wide text-slate-400">системная</span>
                        )}
                        <div className="ml-auto flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-slate-400 hover:text-slate-700"
                            onClick={() => startEditColumn(col)}
                            title="Редактировать"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          {!col.isSystem && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-slate-400 hover:text-red-500"
                                  title="Удалить"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Удалить колонку «{col.name}»?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Задачи из этой колонки переедут в «К выполнению».
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Отмена</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => deleteColumn(col.id)} className="bg-red-600 hover:bg-red-700">
                                    Удалить
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setColumnsOpen(false)}>Закрыть</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function NewBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white ring-2 ring-white">
      +{count}
    </span>
  );
}

function KanbanColumn({ column, count, children }: { column: TaskColumn; count: number; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: column.key });
  return (
    <div
      ref={setNodeRef}
      className={`rounded-lg transition-colors ${isOver ? "bg-orange-50/60 ring-2 ring-orange-300" : ""}`}
    >
      <div className="mb-3 flex items-center justify-between px-1">
        <span
          className="rounded-full px-2.5 py-0.5 text-xs font-medium"
          style={hexToBadgeStyle(column.color)}
        >
          {column.name}
        </span>
        <span className="text-xs text-slate-400">{count}</span>
      </div>
      <div className="space-y-2 min-h-[60px] p-1">
        {children}
      </div>
    </div>
  );
}

type CardProps = {
  task: any;
  onDelete: (id: string) => void;
  selectMode?: boolean;
  selected?: boolean;
  onToggleSelect?: (id: string) => void;
  canDelete?: boolean;
  canDrag?: boolean;
};

function DraggableTaskCard({ task, onDelete, selectMode, selected, onToggleSelect, canDelete, canDrag = true }: CardProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: task.id,
    disabled: selectMode || !canDrag,
  });
  return (
    <div
      ref={setNodeRef}
      className={`relative ${isDragging ? "opacity-30" : ""}`}
    >
      {!selectMode && canDrag && (
        <button
          type="button"
          {...listeners}
          {...attributes}
          className="absolute left-1 top-1 z-10 cursor-grab active:cursor-grabbing rounded p-1 text-slate-300 hover:bg-slate-100 hover:text-slate-500 transition-colors"
          title="Перетащить"
          aria-label="Перетащить задачу"
        >
          <GripVertical className="h-3.5 w-3.5" />
        </button>
      )}
      <div className={selectMode || !canDrag ? "" : "pl-5"}>
        <TaskCard
          task={task}
          onDelete={onDelete}
          selectMode={selectMode}
          selected={selected}
          onToggleSelect={onToggleSelect}
          canDelete={canDelete}
        />
      </div>
    </div>
  );
}

function TaskProductionPill({ task }: { task: any }) {
  const filled = TASK_PRODUCTION_FIELDS.filter((f) => Boolean(task?.[f.key])).length;
  const total = TASK_PRODUCTION_FIELDS.length;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          onClick={(e) => e.stopPropagation()}
          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 transition-colors ${
            filled === 0
              ? "bg-slate-50 text-slate-400 ring-slate-200 hover:bg-slate-100"
              : "bg-orange-50 text-orange-700 ring-orange-200 hover:bg-orange-100"
          }`}
          title="Производственные статусы"
        >
          <Factory className="h-3 w-3" />
          {filled}/{total}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-2" onClick={(e) => e.stopPropagation()}>
        <div className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
          Производство
        </div>
        <div className="space-y-1">
          {TASK_PRODUCTION_FIELDS.map((f) => {
            const value = task?.[f.key] ?? null;
            const opt = value ? f.options.find((o) => o.value === value) : null;
            return (
              <div key={f.key} className="flex items-center justify-between gap-2 px-2 py-1 rounded-md hover:bg-slate-50">
                <span className="text-xs text-slate-600">{f.label}</span>
                {opt ? (
                  <span className={`inline-flex h-5 items-center rounded-full px-2 text-[10px] font-medium ${opt.className}`}>
                    {opt.label}
                  </span>
                ) : (
                  <span className="inline-flex h-5 items-center rounded-full bg-slate-50 px-2 text-[10px] font-medium text-slate-400 ring-1 ring-slate-200">
                    не указано
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function TaskCard({ task, onDelete, selectMode, selected, onToggleSelect, canDelete }: CardProps) {
  const subtasksTotal = task.subtasks?.length ?? 0;
  const subtasksDone = task.subtasks?.filter((s: any) => s.status === "DONE").length ?? 0;

  const cardClass = `rounded-lg border bg-white p-4 transition-shadow ${
    selectMode
      ? selected
        ? "border-orange-400 ring-2 ring-orange-200 cursor-pointer"
        : "border-slate-200 cursor-pointer hover:border-orange-300"
      : "border-slate-200 hover:shadow-sm"
  }`;

  const handleCardClick = (e: React.MouseEvent) => {
    if (!selectMode) return;
    e.preventDefault();
    onToggleSelect?.(task.id);
  };

  return (
    <div className={cardClass} onClick={handleCardClick}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-start gap-2 flex-1 min-w-0">
          {selectMode && (
            <input
              type="checkbox"
              checked={!!selected}
              onChange={() => onToggleSelect?.(task.id)}
              onClick={(e) => e.stopPropagation()}
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 accent-orange-500"
            />
          )}
          {selectMode ? (
            <span className="text-sm font-medium text-slate-800 leading-tight">{task.title}</span>
          ) : (
            <Link href={`/tasks/${task.id}`} className="text-sm font-medium text-slate-800 hover:text-slate-600 leading-tight">
              {task.title}
            </Link>
          )}
        </div>
        {!selectMode && (
          <div className="flex gap-1 shrink-0">
            <Link href={`/tasks/${task.id}`}>
              <button className="text-slate-300 hover:text-slate-600 transition-colors p-0.5">
                <Eye className="h-3.5 w-3.5" />
              </button>
            </Link>
            {canDelete && (
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
            )}
          </div>
        )}
      </div>

      {/* Теги */}
      {task.tags?.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {task.tags.map((tag: any) => (
            <span
              key={tag.id}
              className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium text-white"
              style={{ backgroundColor: tag.color }}
            >
              {tag.name}
            </span>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-1.5 mb-2">
        <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${PRIORITY_COLORS[task.priority]}`}>
          {PRIORITY_LABELS[task.priority]}
        </span>
        {subtasksTotal > 0 && (
          <span
            className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
              subtasksDone === subtasksTotal
                ? "bg-green-100 text-green-700"
                : "bg-slate-100 text-slate-600"
            }`}
            title="Подзадачи"
          >
            ✓ {subtasksDone}/{subtasksTotal}
          </span>
        )}
        <TaskProductionPill task={task} />
      </div>

      <div className="flex items-end justify-between gap-2">
        <div className="space-y-1 text-[11px] text-slate-400 flex-1 min-w-0">
          {task.client && (
            <p className="truncate">🏢 {task.client.shortName || task.client.name}</p>
          )}
          {task.workshop && (
            <p className="truncate">Цех: {task.workshop.name}</p>
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
        {task.assignees && task.assignees.length > 0 && (
          <div className="flex shrink-0 -space-x-1.5">
            {task.assignees.slice(0, 3).map((a: any) => (
              <div
                key={a.id}
                className="h-7 w-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[11px] font-medium ring-2 ring-white"
                title={a.name}
              >
                {a.name.charAt(0).toUpperCase()}
              </div>
            ))}
            {task.assignees.length > 3 && (
              <div
                className="h-7 w-7 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-[10px] font-medium ring-2 ring-white"
                title={task.assignees.slice(3).map((a: any) => a.name).join(", ")}
              >
                +{task.assignees.length - 3}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
