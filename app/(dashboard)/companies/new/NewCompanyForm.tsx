"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Building2, Link2, Loader2, Search, X } from "lucide-react";

type Manager = { id: string; name: string; role: string };

/**
 * Существующий контрагент, найденный по ИНН. Если `isPortalEnabled=true`,
 * к нему нельзя создавать ещё один кабинет — submit блокируется.
 */
type ExistingClient = {
  id: string;
  name: string;
  shortName: string | null;
  inn: string | null;
  type: "INDIVIDUAL" | "COMPANY";
  isPortalEnabled: boolean;
};

export function NewCompanyForm({ managers }: { managers: Manager[] }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Поля компании
  const [name, setName] = useState("");
  const [shortName, setShortName] = useState("");
  const [inn, setInn] = useState("");
  const [kpp, setKpp] = useState("");
  const [ogrn, setOgrn] = useState("");
  const [legalAddress, setLegalAddress] = useState("");
  const [director, setDirector] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [managerId, setManagerId] = useState(managers[0]?.id ?? "");

  // Поля пользователя кабинета
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [userPassword, setUserPassword] = useState("");
  const [userPhone, setUserPhone] = useState("");

  // ─── Существующий контрагент (привязка) ──────────────────────────────────────
  // existingMatch — что нашли по ИНН: предложение «привязать?» или предупреждение
  // «уже есть кабинет». attached — пользователь подтвердил режим привязки.
  const [existingMatch, setExistingMatch] = useState<ExistingClient | null>(null);
  const [attached, setAttached] = useState<ExistingClient | null>(null);
  const innCheckRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ─── DaData ──────────────────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [innLoading, setInnLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function applyDadata(s: any) {
    const d = s.data;
    if (d.name?.full_with_opf) setName(d.name.full_with_opf);
    else if (s.value) setName(s.value);
    if (d.name?.short_with_opf) setShortName(d.name.short_with_opf);
    if (d.inn) setInn(d.inn);
    if (d.kpp) setKpp(d.kpp);
    if (d.ogrn) setOgrn(d.ogrn);
    if (d.address?.value) setLegalAddress(d.address.value);
    if (d.management?.name) setDirector(d.management.name);
    // ИНН изменился — проверим в CRM сразу, без debounce.
    if (d.inn) checkInn(d.inn);
  }

  // ─── Проверка ИНН в нашей CRM ───────────────────────────────────────────────
  // Срабатывает при ручном вводе ИНН (с debounce 500мс) или сразу после
  // выбора в DaData. Любая правка ИНН сбрасывает уже выбранную привязку.
  async function checkInn(value: string) {
    const query = value.trim();
    if (query.length < 10) {
      setExistingMatch(null);
      return;
    }
    try {
      const res = await fetch(`/api/clients/by-inn?inn=${encodeURIComponent(query)}`);
      if (!res.ok) {
        setExistingMatch(null);
        return;
      }
      const data: ExistingClient | null = await res.json();
      // Если пользователь уже подтвердил привязку и ИНН тот же — не сбрасываем.
      if (attached && data?.id === attached.id) return;
      setExistingMatch(data);
    } catch {
      setExistingMatch(null);
    }
  }

  function onInnChange(value: string) {
    setInn(value);
    if (attached) {
      // Любое ручное редактирование ИНН после привязки → выходим из режима.
      detachExisting();
    }
    if (innCheckRef.current) clearTimeout(innCheckRef.current);
    innCheckRef.current = setTimeout(() => checkInn(value), 500);
  }

  function attachExisting(c: ExistingClient) {
    setAttached(c);
    setExistingMatch(null);
    // Подтягиваем имя в поле name, чтобы submit-кнопка показывала контекст.
    setName(c.name);
    setShortName(c.shortName ?? "");
    setInn(c.inn ?? "");
  }

  function detachExisting() {
    setAttached(null);
  }

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

  function pickSuggestion(s: any) {
    applyDadata(s);
    setSearchQuery(s.data?.name?.short_with_opf ?? s.value ?? "");
    setShowDropdown(false);
    setSuggestions([]);
  }

  async function lookupInn() {
    const query = inn.trim();
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
      if (s) applyDadata(s);
    } finally {
      setInnLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setFieldErrors({});

    const userPayload = {
      name: userName.trim(),
      email: userEmail.trim(),
      password: userPassword,
      phone: userPhone.trim() || null,
    };

    const body = attached
      ? { existingClientId: attached.id, managerId, user: userPayload }
      : {
          name: name.trim(),
          shortName: shortName.trim() || null,
          inn: inn.trim() || null,
          kpp: kpp.trim() || null,
          ogrn: ogrn.trim() || null,
          legalAddress: legalAddress.trim() || null,
          director: director.trim() || null,
          phone: phone.trim() || null,
          email: email.trim() || "",
          managerId,
          user: userPayload,
        };

    const res = await fetch("/api/companies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    setSubmitting(false);

    if (!res.ok) {
      setError(data?.error ?? "Не удалось создать кабинет");
      if (data?.fields) setFieldErrors(data.fields);
      return;
    }
    router.push(`/companies/${data.id}`);
    router.refresh();
  }

  // Блок submit-кнопки, если ИНН совпал с уже существующим кабинетом.
  const blockedByPortalCollision =
    !attached && existingMatch?.isPortalEnabled === true;

  return (
    <div>
      <Header title="Новый кабинет" subtitle="Компания + один пользователь-клиент" />
      <div className="p-4 lg:p-6">
        <Link href="/companies" className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800">
          <ArrowLeft className="h-4 w-4" /> К списку
        </Link>

        <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Режим привязки к существующему контрагенту */}
          {attached && (
            <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-4 flex items-start justify-between gap-3">
              <div className="flex items-start gap-2">
                <Link2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                <div>
                  <p className="text-sm font-medium text-emerald-900">
                    Кабинет будет привязан к контрагенту «{attached.name}»
                  </p>
                  <p className="text-xs text-emerald-700">
                    Реквизиты берутся из существующего контрагента. История заявок,
                    КП и счетов сохранится под этой же записью.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={detachExisting}
                className="rounded p-1 text-emerald-700 hover:bg-emerald-100"
                title="Отменить привязку"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* DaData поиск — только в режиме создания нового контрагента */}
          {!attached && (
            <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-2">
              <h2 className="text-sm font-semibold text-slate-800">Поиск по ИНН или названию</h2>
              <p className="text-xs text-slate-500">
                Выберите из списка — все реквизиты заполнятся автоматически через DaData.
              </p>
              <div ref={searchRef} className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  placeholder="ООО Прокат или 7701234567"
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  onFocus={() => suggestions.length > 0 && setShowDropdown(true)}
                  className="pl-9"
                />
                {suggestLoading && (
                  <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-slate-400" />
                )}
                {showDropdown && suggestions.length > 0 && (
                  <ul className="absolute z-10 mt-1 max-h-72 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">
                    {suggestions.map((s, idx) => (
                      <li
                        key={`${s.data?.inn ?? idx}-${idx}`}
                        onClick={() => pickSuggestion(s)}
                        className="cursor-pointer border-b border-slate-100 px-3 py-2 text-sm hover:bg-orange-50 last:border-b-0"
                      >
                        <div className="flex items-start gap-2">
                          <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-slate-800 truncate">
                              {s.data?.name?.short_with_opf ?? s.value}
                            </p>
                            <p className="text-xs text-slate-500 truncate">
                              ИНН: {s.data?.inn} {s.data?.address?.value ? `· ${s.data.address.value}` : ""}
                            </p>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}

          {/* Плашка: найден существующий контрагент */}
          {!attached && existingMatch && !existingMatch.isPortalEnabled && (
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
              <div className="flex items-start gap-2">
                <Link2 className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-blue-900">
                    В CRM уже есть контрагент с этим ИНН: «{existingMatch.name}»
                  </p>
                  <p className="text-xs text-blue-700 mb-2">
                    Не создавайте дубликат. Привяжите кабинет к существующему — вся история заявок
                    и счетов сохранится под этой записью.
                  </p>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => attachExisting(existingMatch)}
                    >
                      Привязать к «{existingMatch.shortName ?? existingMatch.name}»
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => setExistingMatch(null)}
                    >
                      Игнорировать
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Плашка: у контрагента уже есть кабинет */}
          {!attached && existingMatch?.isPortalEnabled && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4">
              <div className="flex items-start gap-2">
                <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-red-900">
                    У контрагента «{existingMatch.name}» уже есть кабинет
                  </p>
                  <p className="text-xs text-red-700 mb-2">
                    Один контрагент = один кабинет. Откройте существующий или измените ИНН.
                  </p>
                  <Link href={`/companies/${existingMatch.id}`}>
                    <Button type="button" size="sm" variant="outline">
                      Открыть кабинет
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* Компания — только если НЕ привязка */}
          {!attached && (
            <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
              <h2 className="text-sm font-semibold text-slate-800">Компания</h2>
              <div className="space-y-1.5">
                <Label htmlFor="name">Полное название *</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required maxLength={300} />
                {fieldErrors.name && <p className="text-xs text-red-600">{fieldErrors.name}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="shortName">Короткое название</Label>
                <Input id="shortName" value={shortName} onChange={(e) => setShortName(e.target.value)} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5 sm:col-span-1">
                  <Label htmlFor="inn">ИНН</Label>
                  <div className="flex gap-1">
                    <Input id="inn" value={inn} onChange={(e) => onInnChange(e.target.value)} />
                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      onClick={lookupInn}
                      disabled={innLoading || inn.trim().length < 10}
                      title="Заполнить по ИНН через DaData"
                    >
                      {innLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="kpp">КПП</Label>
                  <Input id="kpp" value={kpp} onChange={(e) => setKpp(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ogrn">ОГРН</Label>
                  <Input id="ogrn" value={ogrn} onChange={(e) => setOgrn(e.target.value)} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="legalAddress">Юридический адрес</Label>
                <Input id="legalAddress" value={legalAddress} onChange={(e) => setLegalAddress(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="director">Руководитель</Label>
                <Input id="director" value={director} onChange={(e) => setDirector(e.target.value)} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="phone">Телефон</Label>
                  <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="cemail">Email компании</Label>
                  <Input id="cemail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                  {fieldErrors.email && <p className="text-xs text-red-600">{fieldErrors.email}</p>}
                </div>
              </div>
            </div>
          )}

          {/* Ответственный менеджер — общий блок */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
            <h2 className="text-sm font-semibold text-slate-800">Ответственный менеджер</h2>
            <div className="space-y-1.5">
              <Label htmlFor="manager">Менеджер *</Label>
              <select
                id="manager"
                value={managerId}
                onChange={(e) => setManagerId(e.target.value)}
                required
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                {managers.length === 0 && <option value="">Нет доступных менеджеров</option>}
                {managers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.role === "ADMIN" ? "админ" : "менеджер"})
                  </option>
                ))}
              </select>
              {fieldErrors.managerId && <p className="text-xs text-red-600">{fieldErrors.managerId}</p>}
            </div>
          </div>

          {/* Пользователь кабинета */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
            <h2 className="text-sm font-semibold text-slate-800">Пользователь кабинета</h2>
            <p className="text-xs text-slate-500 -mt-2">
              Этот пользователь будет входить в портал под своим email и паролем.
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="uname">Имя *</Label>
              <Input id="uname" value={userName} onChange={(e) => setUserName(e.target.value)} required maxLength={200} />
              {fieldErrors["user.name"] && <p className="text-xs text-red-600">{fieldErrors["user.name"]}</p>}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="uemail">Email (логин) *</Label>
                <Input id="uemail" type="email" value={userEmail} onChange={(e) => setUserEmail(e.target.value)} required />
                {fieldErrors["user.email"] && <p className="text-xs text-red-600">{fieldErrors["user.email"]}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="uphone">Телефон</Label>
                <Input id="uphone" value={userPhone} onChange={(e) => setUserPhone(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="upass">Пароль *</Label>
              <Input id="upass" type="text" value={userPassword} onChange={(e) => setUserPassword(e.target.value)} required minLength={6} />
              {fieldErrors["user.password"] && <p className="text-xs text-red-600">{fieldErrors["user.password"]}</p>}
              <p className="text-xs text-slate-400">Минимум 6 символов. Покажите его клиенту лично.</p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2">
            <Link href="/companies">
              <Button type="button" variant="ghost">Отмена</Button>
            </Link>
            <Button
              type="submit"
              disabled={submitting || managers.length === 0 || blockedByPortalCollision}
            >
              {submitting ? "Создание..." : attached ? "Привязать кабинет" : "Создать кабинет"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
