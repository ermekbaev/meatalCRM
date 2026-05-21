"use client";
import { useState, useEffect } from "react";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { ROLE_LABELS, formatDate } from "@/lib/utils";
import { Plus, Trash2, Pencil, Loader2, ShieldCheck, Shield, User, HardHat, Wrench, Briefcase } from "lucide-react";
import { useForm } from "react-hook-form";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";

const ROLE_ICONS: Record<string, any> = {
  ADMIN: ShieldCheck,
  MANAGER: Shield,
  FOREMAN: HardHat,
  ENGINEER: Wrench,
  EMPLOYEE: User,
  CONTRACTOR: Briefcase,
};

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editUser, setEditUser] = useState<any>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [changePassword, setChangePassword] = useState(false);

  const { register, handleSubmit, reset, setValue, watch, formState: { isSubmitting } } = useForm();

  const fetchUsers = async () => {
    setLoading(true);
    const res = await fetch("/api/users");
    const data = await res.json();
    setUsers(data);
    setLoading(false);
  };

  useEffect(() => { fetchUsers(); }, []);

  const openCreate = () => {
    setEditUser(null);
    setChangePassword(false);
    reset({ name: "", email: "", password: "", role: "EMPLOYEE", telegramChatId: "", position: "" });
    setDialogOpen(true);
  };

  const openEdit = (user: any) => {
    setEditUser(user);
    setChangePassword(false);
    reset({ name: user.name, email: user.email, password: "", role: user.role, telegramChatId: user.telegramChatId ?? "", phone: user.phone ?? "", position: user.position ?? "" });
    setDialogOpen(true);
  };

  const onSubmit = async (data: any) => {
    const url = editUser ? `/api/users/${editUser.id}` : "/api/users";
    const method = editUser ? "PUT" : "POST";
    const payload = { ...data, telegramChatId: data.telegramChatId || null, phone: data.phone || null, position: data.position || null };
    const body = editUser && !data.password
      ? { name: data.name, email: data.email, role: data.role, telegramChatId: payload.telegramChatId, phone: payload.phone, position: payload.position }
      : payload;
    await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    setDialogOpen(false);
    fetchUsers();
  };

  const toggleBlock = async (user: any) => {
    await fetch(`/api/users/${user.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isBlocked: !user.isBlocked }),
    });
    fetchUsers();
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/users/${id}`, { method: "DELETE" });
    fetchUsers();
  };

  const handleAvatarUpload = async (file: File) => {
    if (!editUser) return;
    setAvatarUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`/api/users/${editUser.id}/avatar`, { method: "POST", body: fd });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err.error ?? "Не удалось загрузить аватар");
        return;
      }
      const updated = await res.json();
      setEditUser((prev: any) => ({ ...prev, avatarUrl: updated.avatarUrl }));
      fetchUsers();
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleAvatarDelete = async () => {
    if (!editUser?.avatarUrl) return;
    setAvatarUploading(true);
    try {
      await fetch(`/api/users/${editUser.id}/avatar`, { method: "DELETE" });
      setEditUser((prev: any) => ({ ...prev, avatarUrl: null }));
      fetchUsers();
    } finally {
      setAvatarUploading(false);
    }
  };

  const role = watch("role");

  return (
    <div>
      <Header title="Пользователи" />
      <div className="p-4 lg:p-6 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm text-gray-500">{users.length} пользователей</p>
          <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" /> Добавить</Button>
        </div>

        {/* Mobile cards */}
        <div className="md:hidden space-y-2">
          {loading ? (
            <div className="rounded-xl border border-gray-200 bg-white p-6 text-center text-sm text-gray-400">Загрузка...</div>
          ) : users.map((u) => {
            const RoleIcon = ROLE_ICONS[u.role] ?? User;
            return (
              <div key={u.id} className="rounded-xl border border-gray-200 bg-white p-3">
                <div className="flex items-start gap-2 mb-2">
                  <Avatar name={u.name} src={u.avatarUrl} size={36} />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-gray-900 text-sm truncate">{u.name}</p>
                    <p className="text-xs text-gray-500 truncate">{u.email}</p>
                    {u.position && <p className="text-xs text-gray-400 truncate">{u.position}</p>}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button size="icon" variant="ghost" className="h-9 w-9" onClick={() => openEdit(u)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="icon" variant="ghost" className="h-9 w-9 text-red-500 hover:text-red-600">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Удалить пользователя?</AlertDialogTitle>
                          <AlertDialogDescription>Это действие необратимо.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Отмена</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(u.id)}>Удалить</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-xs text-gray-700">
                    <RoleIcon className="h-3.5 w-3.5 text-gray-400" />
                    <span>{ROLE_LABELS[u.role]}</span>
                    <span className="text-gray-300">·</span>
                    <span className="text-gray-400">{formatDate(u.createdAt)}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Switch checked={!u.isBlocked} onCheckedChange={() => toggleBlock(u)} />
                    <span className={`text-[11px] ${u.isBlocked ? "text-red-500" : "text-green-600"}`}>
                      {u.isBlocked ? "Заблок." : "Активен"}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Desktop table */}
        <div className="hidden md:block rounded-xl border border-gray-200 bg-white overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead>Пользователь</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Роль</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead>Добавлен</TableHead>
                <TableHead className="w-24">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-gray-400">Загрузка...</TableCell></TableRow>
              ) : (
                users.map((u) => {
                  const RoleIcon = ROLE_ICONS[u.role] ?? User;
                  return (
                    <TableRow key={u.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar name={u.name} src={u.avatarUrl} size={32} />
                          <div className="flex flex-col">
                            <span className="font-medium text-gray-900">{u.name}</span>
                            {u.position && (
                              <span className="text-xs text-gray-500">{u.position}</span>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-gray-600">{u.email}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <RoleIcon className="h-4 w-4 text-gray-400" />
                          <span className="text-sm text-gray-700">{ROLE_LABELS[u.role]}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={!u.isBlocked}
                            onCheckedChange={() => toggleBlock(u)}
                          />
                          <span className={`text-xs ${u.isBlocked ? "text-red-500" : "text-green-600"}`}>
                            {u.isBlocked ? "Заблокирован" : "Активен"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-gray-500">{formatDate(u.createdAt)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button size="icon" variant="ghost" onClick={() => openEdit(u)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="icon" variant="ghost" className="text-red-500 hover:text-red-600">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Удалить пользователя?</AlertDialogTitle>
                                <AlertDialogDescription>Это действие необратимо.</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Отмена</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(u.id)}>Удалить</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={(o) => !o && setDialogOpen(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editUser ? "Редактировать пользователя" : "Новый пользователь"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {editUser && (
              <div className="flex items-center gap-4">
                <Avatar name={editUser.name} src={editUser.avatarUrl} size={64} />
                <div className="flex flex-col gap-2">
                  <label className="inline-flex">
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/gif"
                      className="hidden"
                      disabled={avatarUploading}
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleAvatarUpload(f);
                        e.target.value = "";
                      }}
                    />
                    <span className="inline-flex cursor-pointer items-center rounded-md border border-gray-200 px-3 py-1.5 text-sm hover:bg-gray-50">
                      {avatarUploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      {editUser.avatarUrl ? "Заменить фото" : "Загрузить фото"}
                    </span>
                  </label>
                  {editUser.avatarUrl && (
                    <button
                      type="button"
                      onClick={handleAvatarDelete}
                      disabled={avatarUploading}
                      className="text-left text-xs text-red-500 hover:text-red-600"
                    >
                      Удалить фото
                    </button>
                  )}
                  <p className="text-xs text-gray-400">PNG, JPG, WebP. Макс. 5 МБ</p>
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label>Имя *</Label>
              <Input {...register("name", { required: true })} placeholder="Иванов Иван" />
            </div>
            <div className="space-y-2">
              <Label>Email *</Label>
              <Input {...register("email", { required: true })} type="email" placeholder="user@metalcrm.ru" />
            </div>
            {!editUser ? (
              <div className="space-y-2">
                <Label>Пароль *</Label>
                <Input {...register("password", { required: true })} type="password" placeholder="Введите пароль" />
              </div>
            ) : !changePassword ? (
              <div className="space-y-2">
                <Label>Пароль</Label>
                <Button type="button" variant="outline" className="w-full" onClick={() => setChangePassword(true)}>
                  Изменить пароль
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Новый пароль</Label>
                <Input {...register("password")} type="password" placeholder="Введите новый пароль" autoFocus />
                <button
                  type="button"
                  onClick={() => { setValue("password", ""); setChangePassword(false); }}
                  className="text-left text-xs text-gray-500 hover:text-gray-700"
                >
                  Отменить смену пароля
                </button>
              </div>
            )}
            <div className="space-y-2">
              <Label>Роль</Label>
              <Select value={role} onValueChange={(v) => setValue("role", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(ROLE_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Должность</Label>
              <Input {...register("position")} placeholder="Мастер цеха, Оператор ЧПУ..." />
            </div>
            <div className="space-y-2">
              <Label>Телефон</Label>
              <Input {...register("phone")} placeholder="+7 (999) 000-00-00" />
            </div>
            <div className="space-y-2">
              <Label>Telegram Chat ID</Label>
              <Input {...register("telegramChatId")} placeholder="Получите в @userinfobot" />
              <p className="text-xs text-gray-400">Напишите боту @userinfobot — он пришлёт ваш ID</p>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Отмена</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editUser ? "Сохранить" : "Создать"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
