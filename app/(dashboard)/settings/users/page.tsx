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
import { Plus, Trash2, Pencil, Loader2, ShieldCheck, Shield, User } from "lucide-react";
import { useForm } from "react-hook-form";
import { Badge } from "@/components/ui/badge";

const ROLE_ICONS: Record<string, any> = {
  ADMIN: ShieldCheck,
  MANAGER: Shield,
  EMPLOYEE: User,
};

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editUser, setEditUser] = useState<any>(null);

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
    reset({ name: "", email: "", password: "", role: "EMPLOYEE" });
    setDialogOpen(true);
  };

  const openEdit = (user: any) => {
    setEditUser(user);
    reset({ name: user.name, email: user.email, password: "", role: user.role });
    setDialogOpen(true);
  };

  const onSubmit = async (data: any) => {
    const url = editUser ? `/api/users/${editUser.id}` : "/api/users";
    const method = editUser ? "PUT" : "POST";
    const body = editUser && !data.password ? { name: data.name, email: data.email, role: data.role } : data;
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

  const role = watch("role");

  return (
    <div>
      <Header title="Пользователи" />
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">{users.length} пользователей</p>
          <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" /> Добавить</Button>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
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
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-sm font-medium text-blue-700">
                            {u.name.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-medium text-gray-900">{u.name}</span>
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
            <div className="space-y-2">
              <Label>Имя *</Label>
              <Input {...register("name", { required: true })} placeholder="Иванов Иван" />
            </div>
            <div className="space-y-2">
              <Label>Email *</Label>
              <Input {...register("email", { required: true })} type="email" placeholder="user@metalcrm.ru" />
            </div>
            <div className="space-y-2">
              <Label>{editUser ? "Новый пароль (оставьте пустым)" : "Пароль *"}</Label>
              <Input {...register("password", { required: !editUser })} type="password" placeholder="••••••••" />
            </div>
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
