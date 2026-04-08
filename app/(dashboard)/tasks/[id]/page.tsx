"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TASK_STATUS_LABELS, TASK_STATUS_COLORS, PRIORITY_LABELS, PRIORITY_COLORS, formatDate, formatDateTime } from "@/lib/utils";
import {
  ArrowLeft, Send, Loader2, Clock, Paperclip, Trash2,
  FileText, Download, Plus, CheckSquare, Tag, X, Check, Archive, File
} from "lucide-react";
import Link from "next/link";

const TAG_COLORS = [
  "#ef4444", "#f97316", "#eab308", "#22c55e",
  "#3b82f6", "#8b5cf6", "#ec4899", "#6b7280",
];

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
  const [task, setTask] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [comment, setComment] = useState("");
  const [sendingComment, setSendingComment] = useState(false);
  const [users, setUsers] = useState<any[]>([]);

  // Файлы
  const [uploadingFile, setUploadingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Теги
  const [allTags, setAllTags] = useState<any[]>([]);
  const [showTagPicker, setShowTagPicker] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState(TAG_COLORS[5]);
  const [creatingTag, setCreatingTag] = useState(false);

  // Чек-лист
  const [newCheckItem, setNewCheckItem] = useState("");
  const [addingCheck, setAddingCheck] = useState(false);

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

  const doneCount = task?.checklist?.filter((i: any) => i.isCompleted).length ?? 0;
  const totalCount = task?.checklist?.length ?? 0;

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

            {/* Заголовок + теги */}
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <h2 className="text-xl font-semibold text-gray-900">{task.title}</h2>
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

            {/* Чек-лист */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <CheckSquare className="h-4 w-4" /> Чек-лист
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
                {task.checklist?.map((item: any) => (
                  <div key={item.id} className="flex items-center gap-2 group">
                    <button
                      onClick={() => toggleCheckItem(item.id, item.isCompleted)}
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors ${
                        item.isCompleted
                          ? "border-green-500 bg-green-500 text-white"
                          : "border-gray-300 hover:border-green-400"
                      }`}
                    >
                      {item.isCompleted && <Check className="h-3 w-3" />}
                    </button>
                    <span className={`flex-1 text-sm ${item.isCompleted ? "line-through text-gray-400" : "text-gray-700"}`}>
                      {item.text}
                    </span>
                    <button
                      onClick={() => deleteCheckItem(item.id)}
                      className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-opacity"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
                <div className="flex gap-2 pt-1">
                  <Input
                    value={newCheckItem}
                    onChange={(e) => setNewCheckItem(e.target.value)}
                    placeholder="Добавить пункт..."
                    className="flex-1 h-8 text-sm"
                    onKeyDown={(e) => { if (e.key === "Enter") addCheckItem(); }}
                  />
                  <Button size="sm" onClick={addCheckItem} disabled={addingCheck || !newCheckItem.trim()} className="h-8">
                    {addingCheck ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Файлы */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Paperclip className="h-4 w-4" /> Файлы
                  </CardTitle>
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
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-red-500 hover:text-red-600" onClick={() => deleteFile(file.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
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
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">{renderCommentText(c.text)}</p>
                      </div>
                    </div>
                  ))}
                </div>
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
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
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

            {/* Теги */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Tag className="h-4 w-4" /> Теги
                  </CardTitle>
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setShowTagPicker(!showTagPicker)}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-1.5">
                  {task.tags?.length === 0 && <p className="text-xs text-gray-400">Теги не добавлены</p>}
                  {task.tags?.map((tag: any) => (
                    <span
                      key={tag.id}
                      className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium text-white cursor-pointer hover:opacity-80"
                      style={{ backgroundColor: tag.color }}
                      onClick={() => toggleTag(tag.id, true)}
                      title="Убрать тег"
                    >
                      {tag.name} <X className="h-3 w-3" />
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
                          className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium text-white cursor-pointer hover:opacity-80"
                          style={{ backgroundColor: tag.color }}
                          onClick={() => toggleTag(tag.id, false)}
                        >
                          {tag.name}
                        </span>
                      ))}
                    </div>
                    <div className="flex gap-1.5">
                      <Input
                        value={newTagName}
                        onChange={(e) => setNewTagName(e.target.value)}
                        placeholder="Новый тег..."
                        className="flex-1 h-7 text-xs"
                        onKeyDown={(e) => { if (e.key === "Enter") createTag(); }}
                      />
                      <div className="flex gap-1">
                        {TAG_COLORS.map((c) => (
                          <button
                            key={c}
                            className={`h-5 w-5 rounded-full border-2 transition-all ${newTagColor === c ? "border-gray-800 scale-110" : "border-transparent"}`}
                            style={{ backgroundColor: c }}
                            onClick={() => setNewTagColor(c)}
                          />
                        ))}
                      </div>
                      <Button size="sm" onClick={createTag} disabled={creatingTag || !newTagName.trim()} className="h-7 px-2">
                        {creatingTag ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                      </Button>
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
