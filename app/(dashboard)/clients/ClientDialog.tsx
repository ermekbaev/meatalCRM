"use client";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  client?: any;
}

export function ClientDialog({ open, onClose, onSaved, client }: Props) {
  const { register, handleSubmit, reset, setValue, watch, formState: { isSubmitting } } = useForm();

  useEffect(() => {
    if (client) {
      reset(client);
    } else {
      reset({ type: "INDIVIDUAL", name: "", phone: "", email: "", inn: "", address: "", comment: "" });
    }
  }, [client, reset, open]);

  const type = watch("type");

  async function onSubmit(data: any) {
    const url = client ? `/api/clients/${client.id}` : "/api/clients";
    const method = client ? "PUT" : "POST";
    await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{client ? "Редактировать контрагента" : "Новый контрагент"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Тип</Label>
            <Select value={type} onValueChange={(v) => setValue("type", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="INDIVIDUAL">Физ. лицо</SelectItem>
                <SelectItem value="COMPANY">Юр. лицо</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{type === "COMPANY" ? "Название компании" : "ФИО"} *</Label>
            <Input {...register("name", { required: true })} placeholder={type === "COMPANY" ? "ООО «Компания»" : "Иванов Иван Иванович"} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Телефон</Label>
              <Input {...register("phone")} placeholder="+7 (999) 000-00-00" />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input {...register("email")} type="email" placeholder="info@example.com" />
            </div>
          </div>

          {type === "COMPANY" && (
            <div className="space-y-2">
              <Label>ИНН</Label>
              <Input {...register("inn")} placeholder="7700000000" />
            </div>
          )}

          <div className="space-y-2">
            <Label>Адрес</Label>
            <Input {...register("address")} placeholder="г. Минск, ул. Ленина, 1" />
          </div>

          <div className="space-y-2">
            <Label>Комментарий</Label>
            <Textarea {...register("comment")} rows={3} placeholder="Дополнительная информация..." />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Отмена</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {client ? "Сохранить" : "Создать"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
