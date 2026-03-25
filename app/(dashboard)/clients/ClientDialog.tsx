"use client";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Search, Building2 } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  client?: any;
}

const TABS = ["Основное", "Реквизиты", "Банк", "Контакты"];

const SOURCE_OPTIONS = [
  "Авито", "Сайт", "Карты (2ГИС/Яндекс)", "По рекомендации",
  "Звонок", "Соцсети", "Выставка", "Другое",
];

export function ClientDialog({ open, onClose, onSaved, client }: Props) {
  const [tab, setTab] = useState(0);
  const [innLoading, setInnLoading] = useState(false);
  const [bikLoading, setBikLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { register, handleSubmit, reset, setValue, watch, formState: { isSubmitting } } = useForm();

  useEffect(() => {
    setTab(0);
    if (client) {
      reset(client);
    } else {
      reset({
        type: "INDIVIDUAL",
        name: "", shortName: "", legalAddress: "", postalAddress: "",
        phone: "", email: "", inn: "", kpp: "", ogrn: "",
        bankName: "", bankAccount: "", bankCorAccount: "", bankBik: "",
        director: "", website: "", source: "", comment: "",
      });
    }
  }, [client, reset, open]);

  const type = watch("type");
  const inn = watch("inn");
  const bankBik = watch("bankBik");

  // Закрывать dropdown при клике вне
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleSearchChange(value: string) {
    setSearchQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!value.trim() || value.trim().length < 2) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setSuggestLoading(true);
      try {
        const res = await fetch("/api/dadata/party", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: value.trim() }),
        });
        const data = await res.json();
        setSuggestions(data?.suggestions ?? []);
        setShowDropdown(true);
      } finally {
        setSuggestLoading(false);
      }
    }, 350);
  }

  function applySuggestion(s: any) {
    const d = s.data;
    setValue("type", "COMPANY");
    setValue("inn", d.inn ?? "");
    setValue("name", d.name?.full_with_opf ?? s.value ?? "");
    setValue("shortName", d.name?.short_with_opf ?? "");
    setValue("kpp", d.kpp ?? "");
    setValue("ogrn", d.ogrn ?? "");
    setValue("legalAddress", d.address?.value ?? "");
    if (d.management?.name) setValue("director", d.management.name);
    setSearchQuery(d.name?.short_with_opf ?? s.value ?? "");
    setShowDropdown(false);
    setSuggestions([]);
  }

  async function lookupInn() {
    const query = inn?.trim();
    if (!query || query.length < 10) return;
    setInnLoading(true);
    try {
      const res = await fetch("/api/dadata/party", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      const data = await res.json();
      const s = data?.suggestions?.[0];
      if (!s) return;
      const d = s.data;
      setValue("name", d.name?.full_with_opf ?? s.value ?? "");
      setValue("shortName", d.name?.short_with_opf ?? "");
      setValue("kpp", d.kpp ?? "");
      setValue("ogrn", d.ogrn ?? "");
      setValue("legalAddress", d.address?.value ?? "");
      if (d.management?.name) setValue("director", d.management.name);
    } finally {
      setInnLoading(false);
    }
  }

  async function lookupBik() {
    const query = bankBik?.trim();
    if (!query || query.length < 9) return;
    setBikLoading(true);
    try {
      const res = await fetch("/api/dadata/bank", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      const data = await res.json();
      const s = data?.suggestions?.[0];
      if (!s) return;
      const d = s.data;
      setValue("bankName", d.name?.payment ?? s.value ?? "");
      setValue("bankCorAccount", d.correspondent_account ?? "");
    } finally {
      setBikLoading(false);
    }
  }

  async function onSubmit(data: any) {
    const url = client ? `/api/clients/${client.id}` : "/api/clients";
    const method = client ? "PUT" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      alert("Ошибка при сохранении. Попробуйте ещё раз.");
      return;
    }
    onSaved();
  }

  const isIndividual = type === "INDIVIDUAL";

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{client ? "Редактировать контрагента" : "Новый контрагент"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Быстрый поиск по ИНН или названию */}
          {!client && (
            <div className="space-y-1.5" ref={searchRef}>
              <Label className="flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5" />
                Быстрый поиск по ИНН или названию
              </Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                {suggestLoading && (
                  <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-slate-400" />
                )}
                <Input
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  onFocus={() => suggestions.length > 0 && setShowDropdown(true)}
                  placeholder="Введите ИНН или название организации..."
                  className="pl-9"
                />
                {showDropdown && suggestions.length > 0 && (
                  <div className="absolute z-50 mt-1 w-full rounded-lg border border-slate-200 bg-white shadow-lg overflow-hidden">
                    {suggestions.map((s, i) => (
                      <button
                        key={i}
                        type="button"
                        onMouseDown={() => applySuggestion(s)}
                        className="w-full px-4 py-2.5 text-left hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-0"
                      >
                        <div className="text-sm font-medium text-slate-800 truncate">
                          {s.data?.name?.short_with_opf ?? s.value}
                        </div>
                        <div className="text-xs text-slate-400 flex gap-3 mt-0.5">
                          <span>ИНН: {s.data?.inn}</span>
                          {s.data?.address?.value && (
                            <span className="truncate max-w-55">{s.data.address.value}</span>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <p className="text-[11px] text-slate-400">
                Выберите из списка — все реквизиты заполнятся автоматически через DaData
              </p>
            </div>
          )}

          {/* Тип */}
          <div className="space-y-2">
            <Label>Тип контрагента</Label>
            <Select value={type} onValueChange={(v) => setValue("type", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="INDIVIDUAL">Физическое лицо</SelectItem>
                <SelectItem value="COMPANY">Юридическое лицо</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isIndividual ? (
            /* Физ. лицо */
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Имя *</Label>
                  <Input {...register("name", { required: true })} placeholder="Иван" />
                </div>
                <div className="space-y-2">
                  <Label>Фамилия</Label>
                  <Input {...register("shortName")} placeholder="Иванов" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Телефон</Label>
                  <Input {...register("phone")} placeholder="+7 (999) 000-00-00" />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input {...register("email")} type="email" placeholder="ivan@example.com" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Источник</Label>
                <Select value={watch("source") ?? ""} onValueChange={(v) => setValue("source", v)}>
                  <SelectTrigger><SelectValue placeholder="Откуда пришёл клиент?" /></SelectTrigger>
                  <SelectContent>
                    {SOURCE_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Комментарий</Label>
                <Textarea {...register("comment")} rows={3} placeholder="Дополнительная информация..." />
              </div>
            </div>
          ) : (
            /* Юр. лицо — вкладки */
            <>
              <div className="flex border-b border-slate-200">
                {TABS.map((t, i) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTab(i)}
                    className={`px-4 py-2 text-[13px] font-medium border-b-2 transition-colors ${
                      tab === i
                        ? "border-slate-700 text-slate-800"
                        : "border-transparent text-slate-400 hover:text-slate-600"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>

              {/* Основное */}
              {tab === 0 && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Полное наименование *</Label>
                    <Input {...register("name", { required: true })} placeholder='Общество с ограниченной ответственностью "Металл Групп"' />
                  </div>
                  <div className="space-y-2">
                    <Label>Краткое наименование</Label>
                    <Input {...register("shortName")} placeholder='ООО "Металл Групп"' />
                  </div>
                  <div className="space-y-2">
                    <Label>Юридический адрес</Label>
                    <Input {...register("legalAddress")} placeholder="г. Москва, ул. Ленина, д. 1" />
                  </div>
                  <div className="space-y-2">
                    <Label>Почтовый адрес</Label>
                    <Input {...register("postalAddress")} placeholder="г. Москва, ул. Ленина, д. 1" />
                  </div>
                  <div className="space-y-2">
                    <Label>Источник</Label>
                    <Select value={watch("source") ?? ""} onValueChange={(v) => setValue("source", v)}>
                      <SelectTrigger><SelectValue placeholder="Откуда пришёл клиент?" /></SelectTrigger>
                      <SelectContent>
                        {SOURCE_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Комментарий</Label>
                    <Textarea {...register("comment")} rows={3} placeholder="Дополнительная информация..." />
                  </div>
                </div>
              )}

              {/* Реквизиты */}
              {tab === 1 && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>ИНН</Label>
                    <div className="flex gap-2">
                      <Input
                        {...register("inn")}
                        placeholder="7700000000"
                        maxLength={12}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={lookupInn}
                        disabled={innLoading || !inn || inn.length < 10}
                        title="Заполнить по ИНН"
                      >
                        {innLoading
                          ? <Loader2 className="h-4 w-4 animate-spin" />
                          : <Search className="h-4 w-4" />}
                      </Button>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Введите ИНН и нажмите 🔍 — данные заполнятся автоматически через DaData
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>КПП</Label>
                      <Input {...register("kpp")} placeholder="770001001" maxLength={9} />
                    </div>
                    <div className="space-y-2">
                      <Label>ОГРН</Label>
                      <Input {...register("ogrn")} placeholder="1027700000000" maxLength={15} />
                    </div>
                  </div>
                </div>
              )}

              {/* Банк */}
              {tab === 2 && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>БИК</Label>
                    <div className="flex gap-2">
                      <Input
                        {...register("bankBik")}
                        placeholder="044525225"
                        maxLength={9}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={lookupBik}
                        disabled={bikLoading || !bankBik || bankBik.length < 9}
                        title="Найти банк по БИК"
                      >
                        {bikLoading
                          ? <Loader2 className="h-4 w-4 animate-spin" />
                          : <Search className="h-4 w-4" />}
                      </Button>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Введите БИК и нажмите 🔍 — название банка и корр. счёт заполнятся автоматически
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label>Наименование банка</Label>
                    <Input {...register("bankName")} placeholder='АО "Сбербанк России"' />
                  </div>
                  <div className="space-y-2">
                    <Label>Расчётный счёт</Label>
                    <Input {...register("bankAccount")} placeholder="40702810000000000000" maxLength={20} />
                  </div>
                  <div className="space-y-2">
                    <Label>Корреспондентский счёт</Label>
                    <Input {...register("bankCorAccount")} placeholder="30101810400000000225" maxLength={20} />
                  </div>
                </div>
              )}

              {/* Контакты */}
              {tab === 3 && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Руководитель</Label>
                    <Input {...register("director")} placeholder="Иванов Иван Иванович" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
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
                    <Label>Веб-сайт</Label>
                    <Input {...register("website")} placeholder="https://company.ru" />
                  </div>
                </div>
              )}
            </>
          )}

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
