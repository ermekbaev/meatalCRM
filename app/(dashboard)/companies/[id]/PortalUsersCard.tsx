"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { User, Plus, Pencil, Trash2 } from "lucide-react";

type PortalUser = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  isBlocked: boolean;
  createdAt: Date | string;
};

type FormState = {
  email: string;
  name: string;
  phone: string;
  password: string;
  isBlocked: boolean;
};

const EMPTY: FormState = { email: "", name: "", phone: "", password: "", isBlocked: false };

/**
 * Управление CLIENT-пользователями кабинета: создание, редактирование,
 * блокировка и удаление. Видно ADMIN и MANAGER (для своих компаний).
 * Серверный component получает users из БД, после мутаций — router.refresh().
 */
export function PortalUsersCard({
  companyId,
  users,
}: {
  companyId: string;
  users: PortalUser[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<PortalUser | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY);
    setError(null);
    setOpen(true);
  }
  function openEdit(u: PortalUser) {
    setEditing(u);
    setForm({
      email: u.email,
      name: u.name,
      phone: u.phone ?? "",
      password: "",
      isBlocked: u.isBlocked,
    });
    setError(null);
    setOpen(true);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      const url = editing
        ? `/api/companies/${companyId}/portal-users/${editing.id}`
        : `/api/companies/${companyId}/portal-users`;
      const method = editing ? "PUT" : "POST";
      // На редактировании пустой password = «не менять», на создании — обязателен.
      const body: Record<string, unknown> = {
        email: form.email.trim(),
        name: form.name.trim(),
        phone: form.phone.trim() || null,
      };
      if (form.password) body.password = form.password;
      if (editing) body.isBlocked = form.isBlocked;
      else if (!form.password) {
        setError("Укажите пароль");
        setSaving(false);
        return;
      }

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        // fields — это {email: "...", password: "..."}, склеим в одно сообщение.
        const fieldMsg = data?.fields
          ? Object.values(data.fields as Record<string, string>).join("; ")
          : null;
        setError(fieldMsg || data?.error || `Ошибка (HTTP ${res.status})`);
        return;
      }
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Сетевая ошибка");
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(u: PortalUser) {
    if (!confirm(`Удалить пользователя «${u.name}»?`)) return;
    const res = await fetch(`/api/companies/${companyId}/portal-users/${u.id}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data?.error ?? `Не удалось удалить (HTTP ${res.status})`);
      return;
    }
    router.refresh();
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-emerald-500" />
          <h2 className="text-sm font-semibold text-slate-800">Пользователи кабинета</h2>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-1 rounded-md border border-gray-200 px-2 py-1 text-xs text-slate-600 hover:border-orange-300 hover:text-orange-600 transition-colors"
        >
          <Plus className="h-3.5 w-3.5" /> Добавить
        </button>
      </div>

      {users.length === 0 ? (
        <p className="text-sm text-slate-400">Пользователей пока нет</p>
      ) : (
        <ul className="space-y-3">
          {users.map((u) => (
            <li key={u.id} className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-medium text-slate-900">{u.name}</p>
                  {u.isBlocked && (
                    <span className="rounded-md bg-red-50 px-2 py-0.5 text-[11px] font-medium text-red-700 ring-1 ring-red-200">
                      заблокирован
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-600 truncate">{u.email}</p>
                {u.phone && <p className="text-xs text-slate-500">{u.phone}</p>}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => openEdit(u)}
                  className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                  title="Редактировать"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(u)}
                  className="rounded-md p-1.5 text-red-500 hover:bg-red-50"
                  title="Удалить"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editing ? "Редактировать пользователя" : "Новый пользователь"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={onSubmit} className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="pu-name">Имя</Label>
              <Input
                id="pu-name"
                value={form.name}
                onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="pu-email">Email</Label>
              <Input
                id="pu-email"
                type="email"
                value={form.email}
                onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="pu-phone">Телефон</Label>
              <Input
                id="pu-phone"
                value={form.phone}
                onChange={(e) => setForm((s) => ({ ...s, phone: e.target.value }))}
                placeholder="+7..."
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="pu-password">
                Пароль {editing && <span className="text-xs text-slate-400">(оставьте пустым, чтобы не менять)</span>}
              </Label>
              <Input
                id="pu-password"
                type="password"
                value={form.password}
                onChange={(e) => setForm((s) => ({ ...s, password: e.target.value }))}
                placeholder={editing ? "Новый пароль" : "Минимум 6 символов"}
              />
            </div>
            {editing && (
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300"
                  checked={form.isBlocked}
                  onChange={(e) => setForm((s) => ({ ...s, isBlocked: e.target.checked }))}
                />
                Заблокировать вход в кабинет
              </label>
            )}
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                {error}
              </div>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={saving}>
                Отмена
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Сохранение..." : editing ? "Сохранить" : "Создать"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
