"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TASK_STATUS_LABELS, PRIORITY_LABELS, PRIORITY_COLORS, ROLE_LABELS, TASK_PRODUCTION_FIELDS, CHANGELOG_FIELD_LABELS, formatDate, formatDateTime, hexToBadgeStyle } from "@/lib/utils";
import {
  ArrowLeft, Send, Loader2, Clock, Paperclip, Trash2,
  FileText, Download, Plus, CheckSquare, Tag, X, Check, Archive, File, Printer, Factory, BookOpen
} from "lucide-react";
import { CatalogPickerDialog } from "@/components/CatalogPickerDialog";
import Link from "next/link";

const TAG_COLORS = [
  "#ef4444", "#f97316", "#eab308", "#22c55e",
  "#3b82f6", "#8b5cf6", "#ec4899", "#6b7280",
];

type TaskDetailTab = "description" | "subtasks" | "chat" | "history";

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
}

function getFileIcon(mimeType?: string, fileName?: string) {
  const ext = fileName?.split(".").pop()?.toLowerCase();
  if (ext === "dxf") return <File className="h-4 w-4 text-purple-400" />;
  if (ext === "rar" || ext === "zip") return <Archive className="h-4 w-4 text-yellow-500" />;
  if (!mimeType) return <FileText className="h-4 w-4 text-gray-400" />;
  if (mimeType.startsWith("image/")) return <FileText className="h-4 w-4 text-blue-400" />;
  if (mimeType === "application/pdf") return <FileText className="h-4 w-4 text-red-400" />;
  if (mimeType === "application/zip" || mimeType === "application/x-zip-compressed" || mimeType === "application/vnd.rar" || mimeType === "application/x-rar-compressed") return <Archive className="h-4 w-4 text-yellow-500" />;
  return <FileText className="h-4 w-4 text-gray-400" />;
}

function formatDateInput(value?: string | Date | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function isSubTaskOverdue(item: any) {
  if (!item.dueDate || item.status === "DONE") return false;
  const due = new Date(item.dueDate);
  if (Number.isNaN(due.getTime())) return false;
  due.setHours(23, 59, 59, 999);
  return due < new Date();
}

// Парсим @упоминания в тексте и подсвечиваем
function renderCommentText(text: string) {
  const parts = text.split(/(@\w+)/g);
  return parts.map((part, i) =>
    part.startsWith("@")
      ? <span key={i} className="text-blue-600 font-medium">{part}</span>
      : part
  );
}

export default function TaskDetailPage() {
  const params = useParams();
  const { data: session } = useSession();
  const role = (session?.user as any)?.role;
  const canEditTask = role === "ADMIN" || role === "MANAGER";
  const canChangeStatus = canEditTask || role === "FOREMAN" || role === "ENGINEER" || role === "EMPLOYEE";
  // CONTRACTOR — только просмотр: комментарии/файлы/теги/подзадачи/чек-лист недоступны.
  const isReadOnly = role === "CONTRACTOR";
  const [task, setTask] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<TaskDetailTab>("description");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [comment, setComment] = useState("");
  const [sendingComment, setSendingComment] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [workshops, setWorkshops] = useState<any[]>([]);
  const [taskColumns, setTaskColumns] = useState<Array<{ id: string; key: string; name: string; color: string; order: number; isSystem: boolean }>>([]);
  const [showAssigneePicker, setShowAssigneePicker] = useState(false);
  const [assigneeQuery, setAssigneeQuery] = useState("");

  // Файлы
  const [uploadingFile, setUploadingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Теги
  const [allTags, setAllTags] = useState<any[]>([]);
  const [showTagPicker, setShowTagPicker] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState(TAG_COLORS[5]);
  const [creatingTag, setCreatingTag] = useState(false);

  // Чек-лист (legacy — оставлен для совместимости, миграция перенесла данные в subtasks)
  const [newCheckItem, setNewCheckItem] = useState("");
  const [addingCheck, setAddingCheck] = useState(false);

  // Подзадачи
  const [newSubTitle, setNewSubTitle] = useState("");
  // Тип подзадачи: с количеством (материал) или чисто текстовая (инструкция).
  const [newSubHasQty, setNewSubHasQty] = useState(true);
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [newSubQty, setNewSubQty] = useState("");
  const [newSubUnit, setNewSubUnit] = useState("шт");
  const [newSubPriority, setNewSubPriority] = useState("MEDIUM");
  const [newSubAssignee, setNewSubAssignee] = useState<string>("");
  const [newSubDueDate, setNewSubDueDate] = useState("");
  const [addingSub, setAddingSub] = useState(false);

  // Редактирование заголовка
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState("");

  // Редактирование описания
  const [editingDescription, setEditingDescription] = useState(false);
  const [descriptionValue, setDescriptionValue] = useState("");

  // Упоминания
  const [mentionQuery, setMentionQuery] = useState("");
  const [showMentions, setShowMentions] = useState(false);
  const commentRef = useRef<HTMLTextAreaElement>(null);

  const fetchTask = useCallback(async () => {
    const res = await fetch(`/api/tasks/${params.id}`);
    const data = await res.json();
    setTask(data);
    setLoading(false);
  }, [params.id]);

  useEffect(() => {
    fetchTask();
    fetch("/api/users").then((r) => r.json()).then(setUsers).catch(() => {});
    fetch("/api/tags").then((r) => r.json()).then(setAllTags).catch(() => {});
    fetch("/api/workshops").then((r) => r.json()).then((data) => setWorkshops(Array.isArray(data) ? data.filter((w: any) => !w.isVirtual) : [])).catch(() => {});
    fetch("/api/task-columns").then((r) => r.json()).then((data) => setTaskColumns(Array.isArray(data) ? data : [])).catch(() => {});
  }, [fetchTask]);

  const updateField = async (field: string, value: any) => {
    setSaving(true);
    const payload: any = { ...task, [field]: value };
    // Сервер ждёт assigneeIds — приводим из task.assignees, если поле явно не передано
    if (field !== "assigneeIds" && payload.assigneeIds === undefined && Array.isArray(payload.assignees)) {
      payload.assigneeIds = payload.assignees.map((a: any) => a.id);
    }
    const res = await fetch(`/api/tasks/${params.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const updated = await res.json();
    setTask((prev: any) => ({ ...prev, ...updated }));
    setSaving(false);
  };

  const toggleAssignee = async (userId: string) => {
    if (!task) return;
    const currentIds: string[] = (task.assignees ?? []).map((a: any) => a.id);
    const nextIds = currentIds.includes(userId)
      ? currentIds.filter((id) => id !== userId)
      : [...currentIds, userId];
    await updateField("assigneeIds", nextIds);
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

  // --- Файлы ---
  const uploadFile = async (file: File) => {
    setUploadingFile(true);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch(`/api/tasks/${params.id}/files`, { method: "POST", body: fd });
    if (res.ok) {
      const record = await res.json();
      setTask((prev: any) => ({ ...prev, files: [...(prev.files ?? []), record] }));
    }
    setUploadingFile(false);
  };

  const deleteFile = async (fileId: string) => {
    await fetch(`/api/tasks/${params.id}/files/${fileId}`, { method: "DELETE" });
    setTask((prev: any) => ({ ...prev, files: prev.files.filter((f: any) => f.id !== fileId) }));
  };

  // --- Теги ---
  const toggleTag = async (tagId: string, hasTag: boolean) => {
    const method = hasTag ? "DELETE" : "POST";
    await fetch(`/api/tasks/${params.id}/tags`, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tagId }),
    });
    if (hasTag) {
      setTask((prev: any) => ({ ...prev, tags: prev.tags.filter((t: any) => t.id !== tagId) }));
    } else {
      const tag = allTags.find((t) => t.id === tagId);
      setTask((prev: any) => ({ ...prev, tags: [...(prev.tags ?? []), tag] }));
    }
  };

  const createTag = async () => {
    if (!newTagName.trim()) return;
    setCreatingTag(true);
    const res = await fetch("/api/tags", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newTagName.trim(), color: newTagColor }),
    });
    if (res.ok) {
      const tag = await res.json();
      setAllTags((prev) => [...prev, tag]);
      setNewTagName("");
    }
    setCreatingTag(false);
  };

  const deleteTagGlobal = async (tagId: string) => {
    if (!confirm("Удалить тег полностью? Он отвяжется от всех задач.")) return;
    const res = await fetch(`/api/tags/${tagId}`, { method: "DELETE" });
    if (res.ok) {
      setAllTags((prev) => prev.filter((t) => t.id !== tagId));
      setTask((prev: any) => ({ ...prev, tags: prev.tags.filter((t: any) => t.id !== tagId) }));
    }
  };

  // --- Чек-лист ---
  const addCheckItem = async () => {
    if (!newCheckItem.trim()) return;
    setAddingCheck(true);
    const res = await fetch(`/api/tasks/${params.id}/checklist`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: newCheckItem.trim() }),
    });
    if (res.ok) {
      const item = await res.json();
      setTask((prev: any) => ({ ...prev, checklist: [...(prev.checklist ?? []), item] }));
      setNewCheckItem("");
    }
    setAddingCheck(false);
  };

  const toggleCheckItem = (itemId: string, current: boolean) => {
    // Оптимистичное обновление — сразу меняем UI
    setTask((prev: any) => ({
      ...prev,
      checklist: prev.checklist.map((i: any) =>
        i.id === itemId ? { ...i, isCompleted: !current } : i
      ),
    }));
    // Запрос в фоне
    fetch(`/api/tasks/${params.id}/checklist/${itemId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isCompleted: !current }),
    }).catch(() => {
      // Откатываем если ошибка
      setTask((prev: any) => ({
        ...prev,
        checklist: prev.checklist.map((i: any) =>
          i.id === itemId ? { ...i, isCompleted: current } : i
        ),
      }));
    });
  };

  const deleteCheckItem = async (itemId: string) => {
    await fetch(`/api/tasks/${params.id}/checklist/${itemId}`, { method: "DELETE" });
    setTask((prev: any) => ({ ...prev, checklist: prev.checklist.filter((i: any) => i.id !== itemId) }));
  };

  // --- Подзадачи ---
  const addSubTask = async () => {
    if (!newSubTitle.trim()) return;
    setAddingSub(true);
    const res = await fetch(`/api/tasks/${params.id}/subtasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: newSubTitle.trim(),
        // Текстовая подзадача — без количества и единицы измерения.
        quantity: newSubHasQty && newSubQty ? Number(newSubQty) : null,
        unit: newSubHasQty ? (newSubUnit.trim() || null) : null,
        priority: newSubPriority,
        assigneeId: newSubAssignee || null,
        dueDate: newSubDueDate || null,
      }),
    });
    if (res.ok) {
      const item = await res.json();
      setTask((prev: any) => ({ ...prev, subtasks: [...(prev.subtasks ?? []), item] }));
      setNewSubTitle(""); setNewSubQty(""); setNewSubAssignee(""); setNewSubDueDate("");
    }
    setAddingSub(false);
  };

  const updateSubTask = async (subId: string, patch: any) => {
    setTask((prev: any) => ({
      ...prev,
      subtasks: prev.subtasks.map((s: any) => s.id === subId ? { ...s, ...patch } : s),
    }));
    const res = await fetch(`/api/tasks/${params.id}/subtasks/${subId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (res.ok) {
      const updated = await res.json();
      setTask((prev: any) => ({
        ...prev,
        subtasks: prev.subtasks.map((s: any) => s.id === subId ? updated : s),
      }));
    }
  };

  const toggleSubTaskDone = (subId: string, current: string) => {
    updateSubTask(subId, { status: current === "DONE" ? "TODO" : "DONE" });
  };

  const deleteSubTask = async (subId: string) => {
    await fetch(`/api/tasks/${params.id}/subtasks/${subId}`, { method: "DELETE" });
    setTask((prev: any) => ({ ...prev, subtasks: prev.subtasks.filter((s: any) => s.id !== subId) }));
  };

  const [printing, setPrinting] = useState(false);
  const printProductionTask = async () => {
    setPrinting(true);
    try {
      const company = await fetch("/api/settings/company").then((r) => r.ok ? r.json() : null).catch(() => null);
      const { generateProductionPDF } = await import("@/lib/production-pdf");
      await generateProductionPDF(task, company);
    } finally {
      setPrinting(false);
    }
  };

  // --- Упоминания ---
  const handleCommentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setComment(val);
    const cursor = e.target.selectionStart;
    const before = val.slice(0, cursor);
    const match = before.match(/@(\w*)$/);
    if (match) {
      setMentionQuery(match[1]);
      setShowMentions(true);
    } else {
      setShowMentions(false);
    }
  };

  const insertMention = (name: string) => {
    const cursor = commentRef.current?.selectionStart ?? comment.length;
    const before = comment.slice(0, cursor);
    const after = comment.slice(cursor);
    const replaced = before.replace(/@(\w*)$/, `@${name} `);
    setComment(replaced + after);
    setShowMentions(false);
  };

  const filteredUsers = users.filter((u) =>
    u.name.toLowerCase().includes(mentionQuery.toLowerCase())
  );

  const doneCount = task?.subtasks?.filter((s: any) => s.status === "DONE").length ?? 0;
  const totalCount = task?.subtasks?.length ?? 0;
  const commentCount = task?.comments?.length ?? 0;
  const taskTabs: Array<{ key: TaskDetailTab; label: string }> = [
    { key: "description", label: "Описание" },
    { key: "subtasks", label: `Подзадачи${totalCount ? ` ${doneCount}/${totalCount}` : ""}` },
    { key: "chat", label: `Чат${commentCount ? ` ${commentCount}` : ""}` },
    { key: "history", label: `История${task?.changeLogs?.length ? ` ${task.changeLogs.length}` : ""}` },
  ];

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
        <div className="mb-4 flex items-center justify-between gap-2">
          <Link href="/tasks">
            <Button variant="ghost" size="sm"><ArrowLeft className="mr-2 h-4 w-4" /> Назад</Button>
          </Link>
          <div className="flex items-center gap-2">
            {saving && (
              <span className="flex items-center gap-1 text-xs text-gray-400">
                <Loader2 className="h-3 w-3 animate-spin" /> Сохранение...
              </span>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={printProductionTask}
              disabled={printing}
              title="Распечатать производственное задание"
            >
              {printing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Printer className="mr-2 h-4 w-4" />}
              Печать задания
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Main */}
          <div className="lg:col-span-2 space-y-6">

            {/* Заголовок + теги */}
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    {editingTitle && canEditTask ? (
                      <input
                        autoFocus
                        className="w-full text-xl font-semibold text-gray-900 border-b border-orange-400 outline-none bg-transparent"
                        value={titleValue}
                        onChange={(e) => setTitleValue(e.target.value)}
                        onBlur={() => { setEditingTitle(false); if (titleValue.trim() && titleValue !== task.title) updateField("title", titleValue.trim()); }}
                        onKeyDown={(e) => { if (e.key === "Enter") { e.currentTarget.blur(); } if (e.key === "Escape") { setEditingTitle(false); setTitleValue(task.title); } }}
                      />
                    ) : (
                      <h2
                        className={`text-xl font-semibold text-gray-900 ${canEditTask ? "cursor-pointer hover:text-orange-600 transition-colors" : ""}`}
                        onClick={canEditTask ? () => { setTitleValue(task.title); setEditingTitle(true); } : undefined}
                        title={canEditTask ? "Нажмите для редактирования" : undefined}
                      >
                        {task.title}
                      </h2>
                    )}
                    {task.client && (
                      <p className="mt-1 text-sm text-gray-500">
                        Контрагент:{" "}
                        <Link href={`/clients/${task.client.id}`} className="text-blue-600 hover:underline">
                          {task.client.shortName || task.client.name}
                        </Link>
                      </p>
                    )}
                    {/* Теги */}
                    {task.tags?.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {task.tags.map((tag: any) => (
                          <span
                            key={tag.id}
                            className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium text-white"
                            style={{ backgroundColor: tag.color }}
                          >
                            {tag.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 flex-wrap justify-end shrink-0">
                    {(() => {
                      const col = taskColumns.find((c) => c.key === task.status);
                      return (
                        <span
                          className="rounded-full px-3 py-1 text-sm font-medium"
                          style={col ? hexToBadgeStyle(col.color) : undefined}
                        >
                          {col?.name ?? task.status}
                        </span>
                      );
                    })()}
                    <span className={`rounded-full px-3 py-1 text-sm font-medium ${PRIORITY_COLORS[task.priority]}`}>
                      {PRIORITY_LABELS[task.priority]}
                    </span>
                  </div>
                </div>
              </CardHeader>
            </Card>

            {/* Вкладки */}
            <div className="overflow-x-auto border-b border-gray-200">
              <div className="flex min-w-max gap-1">
                {taskTabs.map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveTab(tab.key)}
                    className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
                      activeTab === tab.key
                        ? "border-orange-500 text-orange-600"
                        : "border-transparent text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {activeTab === "description" && (
              <div className="space-y-6">
                <Card>
                  <CardContent className="pt-6">
                {editingDescription ? (
                  <div className="space-y-2">
                    <Textarea
                      autoFocus
                      value={descriptionValue}
                      onChange={(e) => setDescriptionValue(e.target.value)}
                      rows={4}
                      className="text-sm resize-none"
                      onKeyDown={(e) => {
                        if (e.key === "Escape") { setEditingDescription(false); setDescriptionValue(task.description ?? ""); }
                        if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                          setEditingDescription(false);
                          if (descriptionValue !== (task.description ?? "")) updateField("description", descriptionValue);
                        }
                      }}
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => { setEditingDescription(false); if (descriptionValue !== (task.description ?? "")) updateField("description", descriptionValue); }}
                      >
                        <Check className="h-3 w-3 mr-1" /> Сохранить
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs"
                        onClick={() => { setEditingDescription(false); setDescriptionValue(task.description ?? ""); }}
                      >
                        Отмена
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div
                    className="group relative cursor-pointer rounded-md p-1 -m-1 hover:bg-gray-50 transition-colors"
                    onClick={() => { setDescriptionValue(task.description ?? ""); setEditingDescription(true); }}
                    title="Нажмите для редактирования"
                  >
                    {task.description ? (
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{task.description}</p>
                    ) : (
                      <p className="text-sm text-gray-400 italic">Добавить описание...</p>
                    )}
                  </div>
                )}
                  </CardContent>
                </Card>

                {/* Производственные статусы */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Factory className="h-4 w-4 text-slate-400" />
                      Производство
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {TASK_PRODUCTION_FIELDS.map((f) => {
                        const current = (task as any)[f.key] ?? null;
                        const opt = current ? f.options.find((o) => o.value === current) : null;
                        const canEditProd = canEditTask || ((role === "FOREMAN" || role === "ENGINEER" || role === "EMPLOYEE") && (task.assignees ?? []).some((a: any) => a.id === (session?.user as any)?.id));
                        if (!canEditProd) {
                          return (
                            <div key={f.key} className="space-y-1">
                              <p className="text-xs font-medium text-slate-500">{f.label}</p>
                              {opt ? (
                                <span className={`inline-flex h-6 items-center rounded-full px-2.5 text-xs font-medium ${opt.className}`}>
                                  {opt.label}
                                </span>
                              ) : (
                                <span className="inline-flex h-6 items-center rounded-full bg-slate-50 px-2.5 text-xs font-medium text-slate-400 ring-1 ring-slate-200">
                                  не указано
                                </span>
                              )}
                            </div>
                          );
                        }
                        return (
                          <div key={f.key} className="space-y-1">
                            <p className="text-xs font-medium text-slate-500">{f.label}</p>
                            <Select
                              value={current ?? "__none__"}
                              onValueChange={(v) => updateField(f.key, v === "__none__" ? null : v)}
                            >
                              <SelectTrigger
                                className={`h-8 w-full px-2.5 text-xs rounded-full font-medium border-0 shadow-none ${
                                  opt ? opt.className : "bg-slate-50 text-slate-400 ring-1 ring-slate-200"
                                }`}
                              >
                                <SelectValue placeholder="—" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="__none__" className="text-xs">—</SelectItem>
                                {f.options.map((o) => (
                                  <SelectItem key={o.value} value={o.value} className="text-xs">
                                    {o.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Подзадачи */}
            {activeTab === "subtasks" && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <CheckSquare className="h-4 w-4" /> Подзадачи
                  </CardTitle>
                  {totalCount > 0 && (
                    <span className="text-xs text-gray-500">{doneCount} / {totalCount}</span>
                  )}
                </div>
                {totalCount > 0 && (
                  <div className="mt-1 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-green-500 transition-all"
                      style={{ width: `${(doneCount / totalCount) * 100}%` }}
                    />
                  </div>
                )}
              </CardHeader>
              <CardContent className="space-y-2">
                {task.subtasks?.map((item: any) => (
                  <div
                    key={item.id}
                    className={`group rounded-lg border ${
                      isSubTaskOverdue(item)
                        ? "border-red-200 bg-red-50"
                        : "border-gray-100 hover:bg-gray-50"
                    }`}
                  >
                    {/* Верхняя строка: чекбокс + название + удалить */}
                    <div className="flex items-start gap-2 px-2 pt-2 sm:py-1.5">
                      <button
                        onClick={() => toggleSubTaskDone(item.id, item.status)}
                        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors ${
                          item.status === "DONE"
                            ? "border-green-500 bg-green-500 text-white"
                            : "border-gray-300 hover:border-green-400"
                        }`}
                      >
                        {item.status === "DONE" && <Check className="h-3 w-3" />}
                      </button>

                      <span className={`flex-1 min-w-0 text-sm break-words ${item.status === "DONE" ? "line-through text-gray-400" : "text-gray-800"}`}>
                        {item.title}
                        {item.quantity != null && (
                          <span className="ml-1 text-gray-500">
                            {item.quantity} {item.unit || "шт"}
                          </span>
                        )}
                        {isSubTaskOverdue(item) && (
                          <span className="ml-2 text-[10px] font-medium text-red-600 sm:hidden">просрочено</span>
                        )}
                      </span>

                      <button
                        onClick={() => deleteSubTask(item.id)}
                        className="sm:opacity-0 sm:group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-opacity"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    {/* Контролы: 2 колонки на мобиле, инлайн на десктопе */}
                    <div className="grid grid-cols-2 gap-1.5 px-2 pb-2 pt-1.5 sm:flex sm:flex-wrap sm:items-center sm:pt-0 sm:-mt-1 sm:pl-9">
                      <Select value={item.status} onValueChange={(v) => updateSubTask(item.id, { status: v })}>
                        <SelectTrigger className="h-7 text-xs sm:w-[110px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {Object.entries(TASK_STATUS_LABELS).map(([k, v]) => (
                            <SelectItem key={k} value={k}>{v}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Select value={item.priority} onValueChange={(v) => updateSubTask(item.id, { priority: v })}>
                        <SelectTrigger className="h-7 text-xs sm:w-[100px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {Object.entries(PRIORITY_LABELS).map(([k, v]) => (
                            <SelectItem key={k} value={k}>{v}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Select
                        value={item.assigneeId ?? "none"}
                        onValueChange={(v) => updateSubTask(item.id, { assigneeId: v === "none" ? null : v })}
                      >
                        <SelectTrigger className="h-7 text-xs sm:w-[140px]"><SelectValue placeholder="Исполнитель" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Не назначен</SelectItem>
                          {users.map((u: any) => (
                            <SelectItem key={u.id} value={u.id}>
                              {u.name}{(u.position || ROLE_LABELS[u.role]) ? ` · ${u.position || ROLE_LABELS[u.role]}` : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Input
                        type="date"
                        value={formatDateInput(item.dueDate)}
                        onChange={(e) => updateSubTask(item.id, { dueDate: e.target.value || null })}
                        className={`h-7 text-xs sm:w-[135px] ${
                          isSubTaskOverdue(item) ? "border-red-300 bg-white text-red-600" : ""
                        }`}
                        title={isSubTaskOverdue(item) ? "Просрочено" : "Срок подзадачи"}
                      />
                    </div>
                  </div>
                ))}

                {!isReadOnly && (
                <div className="pt-2 border-t border-gray-100">
                  {/* Тип подзадачи + добавление из каталога */}
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <div className="inline-flex rounded-lg border border-gray-200 p-0.5 text-xs">
                      <button
                        type="button"
                        onClick={() => setNewSubHasQty(true)}
                        className={`px-2.5 py-1 rounded-md transition-colors ${newSubHasQty ? "bg-orange-500 text-white" : "text-gray-500 hover:text-gray-700"}`}
                      >
                        С количеством
                      </button>
                      <button
                        type="button"
                        onClick={() => setNewSubHasQty(false)}
                        className={`px-2.5 py-1 rounded-md transition-colors ${!newSubHasQty ? "bg-orange-500 text-white" : "text-gray-500 hover:text-gray-700"}`}
                      >
                        Текстовая
                      </button>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8"
                      onClick={() => setCatalogOpen(true)}
                    >
                      <BookOpen className="h-3.5 w-3.5 mr-1" /> Из каталога
                    </Button>
                  </div>
                  {/* Название отдельной строкой, ввод цифр/полей в сетке 2 колонки на мобиле */}
                  <div className="grid grid-cols-1 sm:flex sm:flex-wrap gap-2">
                    <Input
                      value={newSubTitle}
                      onChange={(e) => setNewSubTitle(e.target.value)}
                      placeholder={newSubHasQty ? "Название (напр. МС-1)" : "Текст задачи (напр. выгрузить лист с машины)"}
                      className="sm:flex-1 sm:min-w-[160px] h-8 text-sm"
                      onKeyDown={(e) => { if (e.key === "Enter") addSubTask(); }}
                    />
                    <div className="grid grid-cols-2 gap-2 sm:contents">
                      {newSubHasQty && (
                        <>
                      <Input
                        value={newSubQty}
                        onChange={(e) => setNewSubQty(e.target.value)}
                        placeholder="Кол-во"
                        type="number"
                        className="h-8 text-sm sm:w-20"
                      />
                      <Input
                        value={newSubUnit}
                        onChange={(e) => setNewSubUnit(e.target.value)}
                        placeholder="ед."
                        className="h-8 text-sm sm:w-16"
                      />
                        </>
                      )}
                      <Select value={newSubPriority} onValueChange={setNewSubPriority}>
                        <SelectTrigger className="h-8 text-sm sm:w-[110px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {Object.entries(PRIORITY_LABELS).map(([k, v]) => (
                            <SelectItem key={k} value={k}>{v}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select value={newSubAssignee || "none"} onValueChange={(v) => setNewSubAssignee(v === "none" ? "" : v)}>
                        <SelectTrigger className="h-8 text-sm sm:w-[150px]"><SelectValue placeholder="Исполнитель" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Не назначен</SelectItem>
                          {users.map((u: any) => (
                            <SelectItem key={u.id} value={u.id}>
                              {u.name}{(u.position || ROLE_LABELS[u.role]) ? ` · ${u.position || ROLE_LABELS[u.role]}` : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        value={newSubDueDate}
                        onChange={(e) => setNewSubDueDate(e.target.value)}
                        type="date"
                        className="h-8 text-sm sm:w-[145px] col-span-2 sm:col-auto"
                        title="Срок подзадачи"
                      />
                    </div>
                    <Button size="sm" onClick={addSubTask} disabled={addingSub || !newSubTitle.trim()} className="h-8 w-full sm:w-auto">
                      {addingSub ? <Loader2 className="h-3 w-3 animate-spin" /> : <><Plus className="h-3 w-3 mr-1" /> Добавить</>}
                    </Button>
                  </div>
                </div>
                )}

                <CatalogPickerDialog
                  open={catalogOpen}
                  onClose={() => setCatalogOpen(false)}
                  onSelect={(item) => {
                    // Подставляем позицию каталога в форму: название и единицу.
                    // Кол-во/исполнителя пользователь указывает сам и жмёт «Добавить».
                    setNewSubHasQty(true);
                    setNewSubTitle(item.name);
                    setNewSubUnit(item.unit || "шт");
                    setCatalogOpen(false);
                  }}
                />
              </CardContent>
            </Card>
            )}

            {/* Файлы */}
            {activeTab === "description" && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Paperclip className="h-4 w-4" /> Файлы
                  </CardTitle>
                  {!isReadOnly && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingFile}
                      className="h-8"
                    >
                      {uploadingFile ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Plus className="h-3 w-3 mr-1" />}
                      Загрузить
                    </Button>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    accept="image/*,.pdf,.dxf,.rar,.zip,.doc,.docx,.xls,.xlsx"
                    onChange={(e) => { if (e.target.files?.[0]) uploadFile(e.target.files[0]); e.target.value = ""; }}
                  />
                </div>
              </CardHeader>
              <CardContent>
                {(!task.files || task.files.length === 0) && (
                  <p className="text-sm text-gray-400">Нет файлов</p>
                )}
                <div className="space-y-2">
                  {task.files?.map((file: any) => (
                    <div key={file.id} className="flex items-center gap-3 rounded-lg border border-gray-100 px-3 py-2 group hover:bg-gray-50">
                      {getFileIcon(file.mimeType, file.originalName)}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{file.originalName}</p>
                        <p className="text-xs text-gray-400">
                          {formatFileSize(file.size)} · {file.uploadedBy?.name} · {formatDate(file.createdAt)}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <a href={`/api/files?key=${encodeURIComponent(file.filename)}&name=${encodeURIComponent(file.originalName)}`}>
                          <Button size="icon" variant="ghost" className="h-7 w-7">
                            <Download className="h-3.5 w-3.5" />
                          </Button>
                        </a>
                        {!isReadOnly && (
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-red-500 hover:text-red-600" onClick={() => deleteFile(file.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            )}

            {/* Комментарии */}
            {activeTab === "chat" && (
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
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="text-sm font-medium text-gray-900">{c.user?.name}</span>
                          {c.user?.position && (
                            <span className="text-xs text-gray-500">· {c.user.position}</span>
                          )}
                          <span className="text-xs text-gray-400">{formatDateTime(c.createdAt)}</span>
                        </div>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">{renderCommentText(c.text)}</p>
                      </div>
                    </div>
                  ))}
                </div>
                {isReadOnly ? null : (
                <div className="relative flex gap-2 pt-2 border-t border-gray-100">
                  <div className="flex-1 relative">
                    <Textarea
                      ref={commentRef}
                      value={comment}
                      onChange={handleCommentChange}
                      placeholder="Напишите комментарий... (используйте @имя для упоминания)"
                      rows={2}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) sendComment();
                        if (e.key === "Escape") setShowMentions(false);
                      }}
                    />
                    {showMentions && filteredUsers.length > 0 && (
                      <div className="absolute bottom-full left-0 mb-1 z-10 w-48 rounded-lg border border-gray-200 bg-white shadow-lg">
                        {filteredUsers.map((u) => (
                          <button
                            key={u.id}
                            className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 text-left"
                            onMouseDown={(e) => { e.preventDefault(); insertMention(u.name); }}
                          >
                            <div className="h-6 w-6 rounded-full bg-blue-100 flex items-center justify-center text-xs text-blue-700 font-medium shrink-0">
                              {u.name.charAt(0)}
                            </div>
                            {u.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <Button onClick={sendComment} disabled={sendingComment || !comment.trim()} size="icon">
                    {sendingComment ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </Button>
                </div>
                )}
              </CardContent>
            </Card>
            )}

            {activeTab === "history" && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">История изменений</CardTitle>
                </CardHeader>
                <CardContent>
                  {(!task.changeLogs || task.changeLogs.length === 0) ? (
                    <p className="text-sm text-gray-400">Изменений пока нет</p>
                  ) : (
                    <div className="space-y-2.5">
                      {task.changeLogs.map((log: any) => (
                        <div key={log.id} className="flex items-start gap-3 text-sm">
                          <Clock className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
                          <div>
                            <span className="font-medium text-gray-700">{log.user?.name}</span>
                            {log.field === "assignee" ? (
                              log.newValue ? (
                                <> добавил исполнителя <span className="font-medium text-gray-600">«{log.newValue}»</span></>
                              ) : (
                                <> убрал исполнителя <span className="font-medium text-gray-600">«{log.oldValue}»</span></>
                              )
                            ) : (
                              <>
                                {" изменил "}
                                <span className="font-medium text-gray-600">
                                  {CHANGELOG_FIELD_LABELS[log.field] ?? log.field}
                                </span>
                                {log.oldValue && (
                                  <span className="text-gray-400"> с «{log.oldValue}»</span>
                                )}
                                {log.newValue ? (
                                  <span> на «{log.newValue}»</span>
                                ) : (
                                  <span className="text-gray-400"> — очищено</span>
                                )}
                              </>
                            )}
                            <span className="ml-2 text-xs text-gray-400">{formatDateTime(log.createdAt)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Параметры</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <p className="text-xs font-medium text-gray-500">Статус</p>
                  <Select value={task.status} onValueChange={(v) => updateField("status", v)} disabled={!canChangeStatus}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {taskColumns.map((col) => (
                        <SelectItem key={col.key} value={col.key}>{col.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-medium text-gray-500">Приоритет</p>
                  <Select value={task.priority} onValueChange={(v) => updateField("priority", v)} disabled={!canEditTask}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(PRIORITY_LABELS).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-gray-500">Ответственные</p>
                    {canEditTask && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0 text-gray-400 hover:text-gray-700"
                        onClick={() => setShowAssigneePicker((v) => !v)}
                        title="Добавить ответственного"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    {(task.assignees ?? []).length === 0 && (
                      <p className="text-xs text-gray-400">Не назначены</p>
                    )}
                    {(task.assignees ?? []).map((a: any) => (
                      <div
                        key={a.id}
                        className="flex items-center gap-2 rounded-md border border-slate-200 px-2 py-1.5"
                      >
                        <div className="h-7 w-7 shrink-0 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[11px] font-medium">
                          {a.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="truncate text-sm text-slate-800">{a.name}</p>
                          {(a.position || ROLE_LABELS[a.role]) && (
                            <p className="truncate text-[10px] text-slate-400">{a.position || ROLE_LABELS[a.role]}</p>
                          )}
                        </div>
                        {canEditTask && (
                          <button
                            type="button"
                            onClick={() => toggleAssignee(a.id)}
                            className="text-slate-300 transition-colors hover:text-red-500"
                            title="Убрать"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  {canEditTask && showAssigneePicker && (() => {
                    const assignedIds = new Set((task.assignees ?? []).map((a: any) => a.id));
                    const q = assigneeQuery.trim().toLowerCase();
                    const candidates = users
                      .filter((u: any) => !assignedIds.has(u.id))
                      .filter((u: any) =>
                        !q
                          ? true
                          : u.name?.toLowerCase().includes(q)
                            || (u.position ?? "").toLowerCase().includes(q)
                            || (ROLE_LABELS[u.role] ?? "").toLowerCase().includes(q)
                      );
                    return (
                      <div className="rounded-md border border-slate-200 p-1.5 space-y-1">
                        <Input
                          autoFocus
                          value={assigneeQuery}
                          onChange={(e) => setAssigneeQuery(e.target.value)}
                          placeholder="Поиск..."
                          className="h-7 text-xs"
                        />
                        <div className="space-y-1 max-h-48 overflow-y-auto">
                          {candidates.length === 0 && (
                            <p className="px-2 py-1 text-xs text-slate-400">
                              {q ? "Ничего не найдено" : "Все пользователи уже добавлены"}
                            </p>
                          )}
                          {candidates.map((u: any) => (
                            <button
                              key={u.id}
                              type="button"
                              onClick={() => { toggleAssignee(u.id); }}
                              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-slate-50"
                            >
                              <div className="h-6 w-6 shrink-0 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-[10px] font-medium">
                                {u.name.charAt(0).toUpperCase()}
                              </div>
                              <span className="flex-1 min-w-0">
                                <span className="block truncate text-slate-800">{u.name}</span>
                                {(u.position || ROLE_LABELS[u.role]) && (
                                  <span className="block truncate text-[10px] text-slate-400">{u.position || ROLE_LABELS[u.role]}</span>
                                )}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-medium text-gray-500">Цех</p>
                  <Select
                    value={task.workshopId ?? "none"}
                    onValueChange={(v) => updateField("workshopId", v === "none" ? null : v)}
                    disabled={!canEditTask}
                  >
                    <SelectTrigger><SelectValue placeholder="Без цеха" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Без цеха</SelectItem>
                      {workshops.map((workshop: any) => (
                        <SelectItem key={workshop.id} value={workshop.id}>{workshop.name}</SelectItem>
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

            {/* Теги */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Tag className="h-4 w-4" /> Теги
                  </CardTitle>
                  {!isReadOnly && (
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setShowTagPicker(!showTagPicker)}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-1.5">
                  {task.tags?.length === 0 && <p className="text-xs text-gray-400">Теги не добавлены</p>}
                  {task.tags?.map((tag: any) => (
                    <span
                      key={tag.id}
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium text-white ${isReadOnly ? "" : "cursor-pointer hover:opacity-80"}`}
                      style={{ backgroundColor: tag.color }}
                      onClick={isReadOnly ? undefined : () => toggleTag(tag.id, true)}
                      title={isReadOnly ? undefined : "Убрать тег"}
                    >
                      {tag.name} {!isReadOnly && <X className="h-3 w-3" />}
                    </span>
                  ))}
                </div>

                {showTagPicker && (
                  <div className="border-t border-gray-100 pt-3 space-y-2">
                    <p className="text-xs font-medium text-gray-500">Все теги</p>
                    <div className="flex flex-wrap gap-1.5">
                      {allTags.filter((t) => !task.tags?.find((tt: any) => tt.id === t.id)).map((tag) => (
                        <span
                          key={tag.id}
                          className="group inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium text-white"
                          style={{ backgroundColor: tag.color }}
                        >
                          <span className="cursor-pointer hover:opacity-80" onClick={() => toggleTag(tag.id, false)}>
                            {tag.name}
                          </span>
                          <button
                            onClick={(e) => { e.stopPropagation(); deleteTagGlobal(tag.id); }}
                            className="opacity-60 hover:opacity-100"
                            title="Удалить тег полностью"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                    <div className="space-y-2">
                      <div className="flex gap-1.5">
                        <Input
                          value={newTagName}
                          onChange={(e) => setNewTagName(e.target.value)}
                          placeholder="Новый тег..."
                          className="flex-1 h-7 text-xs"
                          onKeyDown={(e) => { if (e.key === "Enter") createTag(); }}
                        />
                        <Button size="sm" onClick={createTag} disabled={creatingTag || !newTagName.trim()} className="h-7 px-2">
                          {creatingTag ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                        </Button>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <label
                          className="relative inline-flex h-6 w-6 cursor-pointer items-center justify-center overflow-hidden rounded-full border-2 border-gray-800 ring-1 ring-white"
                          style={{ backgroundColor: newTagColor }}
                          title="Любой цвет"
                        >
                          <input
                            type="color"
                            value={newTagColor}
                            onChange={(e) => setNewTagColor(e.target.value)}
                            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                          />
                        </label>
                        <Input
                          value={newTagColor}
                          onChange={(e) => {
                            const v = e.target.value.trim();
                            if (/^#?[0-9a-fA-F]{0,6}$/.test(v)) {
                              setNewTagColor(v.startsWith("#") ? v : `#${v}`);
                            }
                          }}
                          placeholder="#RRGGBB"
                          className="h-6 w-20 px-1.5 text-[11px] font-mono"
                        />
                        <span className="text-[10px] text-slate-400">или выберите</span>
                        {TAG_COLORS.map((c) => (
                          <button
                            key={c}
                            type="button"
                            className={`h-5 w-5 rounded-full border-2 transition-all ${newTagColor.toLowerCase() === c ? "border-gray-800 scale-110" : "border-transparent"}`}
                            style={{ backgroundColor: c }}
                            onClick={() => setNewTagColor(c)}
                          />
                        ))}
                      </div>
                    </div>
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
