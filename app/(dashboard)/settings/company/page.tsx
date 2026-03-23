"use client";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Save, CheckCircle } from "lucide-react";

export default function CompanySettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);

  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm({
    defaultValues: {
      name: "", shortName: "", inn: "", kpp: "", ogrn: "",
      legalAddress: "", postalAddress: "", phone: "", email: "", website: "",
      bankName: "", bankAccount: "", bankCorAccount: "", bankBik: "", director: "",
    },
  });

  useEffect(() => {
    fetch("/api/settings/company")
      .then((r) => r.json())
      .then((data) => { reset(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [reset]);

  async function onSubmit(data: any) {
    await fetch("/api/settings/company", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  if (loading) {
    return (
      <div>
        <Header title="Реквизиты компании" />
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      </div>
    );
  }

  return (
    <div>
      <Header title="Реквизиты компании" />
      <div className="p-6">
        <form onSubmit={handleSubmit(onSubmit)} className="max-w-2xl space-y-6">

          <Card>
            <CardHeader><CardTitle className="text-base">Общие сведения</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Полное наименование</Label>
                <Input {...register("name")} placeholder='ООО "МеталлПром"' />
              </div>
              <div className="space-y-2">
                <Label>Краткое наименование</Label>
                <Input {...register("shortName")} placeholder='ООО "МеталлПром"' />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label>ИНН</Label>
                  <Input {...register("inn")} placeholder="7700000000" />
                </div>
                <div className="space-y-2">
                  <Label>КПП</Label>
                  <Input {...register("kpp")} placeholder="770001001" />
                </div>
                <div className="space-y-2">
                  <Label>ОГРН</Label>
                  <Input {...register("ogrn")} placeholder="1027700000000" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Директор (ФИО)</Label>
                <Input {...register("director")} placeholder="Иванов Иван Иванович" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Контакты и адреса</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Юридический адрес</Label>
                <Input {...register("legalAddress")} placeholder="115093, г. Москва, ул. Примерная, д. 1" />
              </div>
              <div className="space-y-2">
                <Label>Почтовый адрес</Label>
                <Input {...register("postalAddress")} placeholder="Совпадает с юридическим" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Телефон</Label>
                  <Input {...register("phone")} placeholder="+7 (999) 000-00-00" />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input {...register("email")} type="email" placeholder="info@company.ru" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Сайт</Label>
                <Input {...register("website")} placeholder="https://company.ru" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Банковские реквизиты</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Наименование банка</Label>
                <Input {...register("bankName")} placeholder='АО "Сбербанк России"' />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Расчётный счёт</Label>
                  <Input {...register("bankAccount")} placeholder="40702810000000000000" />
                </div>
                <div className="space-y-2">
                  <Label>БИК</Label>
                  <Input {...register("bankBik")} placeholder="044525225" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Корреспондентский счёт</Label>
                <Input {...register("bankCorAccount")} placeholder="30101810400000000225" />
              </div>
            </CardContent>
          </Card>

          <div className="flex items-center gap-3">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Сохранить
            </Button>
            {saved && (
              <span className="flex items-center gap-1.5 text-sm text-emerald-600">
                <CheckCircle className="h-4 w-4" /> Сохранено
              </span>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
