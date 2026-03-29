"use client";
import { useEffect, useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Save, CheckCircle, Upload, Stamp, PenLine, X } from "lucide-react";

export default function CompanySettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [stampUrl, setStampUrl] = useState<string | null>(null);
  const [signatureUrl, setSignatureUrl] = useState<string | null>(null);
  const [uploadingStamp, setUploadingStamp] = useState(false);
  const [uploadingSignature, setUploadingSignature] = useState(false);
  const stampRef = useRef<HTMLInputElement>(null);
  const signatureRef = useRef<HTMLInputElement>(null);

  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm({
    defaultValues: {
      name: "", shortName: "", inn: "", kpp: "", ogrn: "",
      legalAddress: "", postalAddress: "", phone: "", email: "", website: "",
      bankName: "", bankAccount: "", bankCorAccount: "", bankBik: "", director: "", accountantName: "",
    },
  });

  useEffect(() => {
    fetch("/api/settings/company")
      .then((r) => r.json())
      .then((data) => {
        reset(data);
        setStampUrl(data.stampImage ? `/api/files?key=${encodeURIComponent(data.stampImage)}&view=1` : null);
        setSignatureUrl(data.signatureImage ? `/api/files?key=${encodeURIComponent(data.signatureImage)}&view=1` : null);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [reset]);

  const uploadImage = async (file: File, type: "stamp" | "signature") => {
    const setter = type === "stamp" ? setUploadingStamp : setUploadingSignature;
    setter(true);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("type", type);
    const res = await fetch("/api/settings/company/images", { method: "POST", body: fd });
    if (res.ok) {
      const { path } = await res.json();
      const viewUrl = `/api/files?key=${encodeURIComponent(path)}&view=1`;
      if (type === "stamp") setStampUrl(viewUrl);
      else setSignatureUrl(viewUrl);
    }
    setter(false);
  };

  const clearImage = async (type: "stamp" | "signature") => {
    await fetch("/api/settings/company", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [type === "stamp" ? "stampImage" : "signatureImage"]: null }),
    });
    if (type === "stamp") setStampUrl(null);
    else setSignatureUrl(null);
  };

  async function onSubmit(data: any) {
    // Не отправляем stampImage/signatureImage — они управляются отдельно через uploadImage/clearImage
    const { stampImage: _s, signatureImage: _sig, ...fields } = data;
    await fetch("/api/settings/company", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(fields),
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
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Директор / Руководитель (ФИО)</Label>
                  <Input {...register("director")} placeholder="Иванов Иван Иванович" />
                </div>
                <div className="space-y-2">
                  <Label>Бухгалтер (ФИО)</Label>
                  <Input {...register("accountantName")} placeholder="Петрова Мария Ивановна" />
                </div>
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

          {/* Печать и подпись */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Печать и подпись для счетов и КП</CardTitle>
              <p className="text-xs text-gray-500 mt-1">Загрузите PNG/JPG с прозрачным фоном. Они автоматически вставляются в PDF.</p>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-6">
              {/* Печать */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Stamp className="h-4 w-4 text-gray-500" />
                  <Label>Печать организации</Label>
                </div>
                {stampUrl ? (
                  <div className="relative inline-block">
                    <img src={stampUrl} alt="Печать" className="h-28 rounded border border-gray-200 object-contain bg-gray-50 p-2" />
                    <button onClick={() => clearImage("stamp")} className="absolute -top-2 -right-2 rounded-full bg-red-500 text-white p-0.5 hover:bg-red-600">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <div
                    onClick={() => stampRef.current?.click()}
                    className="flex h-28 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-200 hover:border-orange-400 hover:bg-orange-50 transition-colors"
                  >
                    {uploadingStamp ? <Loader2 className="h-5 w-5 animate-spin text-gray-400" /> : <Upload className="h-5 w-5 text-gray-400" />}
                    <span className="text-xs text-gray-500">{uploadingStamp ? "Загрузка..." : "Нажмите для загрузки"}</span>
                  </div>
                )}
                <input ref={stampRef} type="file" accept="image/*" className="hidden"
                  onChange={(e) => e.target.files?.[0] && uploadImage(e.target.files[0], "stamp")} />
              </div>

              {/* Подпись */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <PenLine className="h-4 w-4 text-gray-500" />
                  <Label>Подпись</Label>
                </div>
                {signatureUrl ? (
                  <div className="relative inline-block">
                    <img src={signatureUrl} alt="Подпись" className="h-28 rounded border border-gray-200 object-contain bg-gray-50 p-2" />
                    <button onClick={() => clearImage("signature")} className="absolute -top-2 -right-2 rounded-full bg-red-500 text-white p-0.5 hover:bg-red-600">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <div
                    onClick={() => signatureRef.current?.click()}
                    className="flex h-28 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-200 hover:border-orange-400 hover:bg-orange-50 transition-colors"
                  >
                    {uploadingSignature ? <Loader2 className="h-5 w-5 animate-spin text-gray-400" /> : <Upload className="h-5 w-5 text-gray-400" />}
                    <span className="text-xs text-gray-500">{uploadingSignature ? "Загрузка..." : "Нажмите для загрузки"}</span>
                  </div>
                )}
                <input ref={signatureRef} type="file" accept="image/*" className="hidden"
                  onChange={(e) => e.target.files?.[0] && uploadImage(e.target.files[0], "signature")} />
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
