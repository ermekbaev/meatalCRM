"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Factory, Plus, Trash2 } from "lucide-react";
import { PORTAL_PRODUCTION_FIELDS } from "@/lib/utils";

type ProductionState = Partial<Record<
  "laserStatus" | "bendingStatus" | "weldingStatus" | "paintingStatus"
  | "sandblastingStatus" | "extraWorkStatus" | "deliveryStatus",
  string | null
>>;

type Position = { id: string; name: string; unit: string };

type Item = {
  // Локальный id для key. Не отправляется на сервер.
  key: string;
  name: string;
  quantity: string;
  unit: string;
};

function makeKey() {
  return Math.random().toString(36).slice(2);
}

export function NewPortalRequestForm({ positions }: { positions: Position[] }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [items, setItems] = useState<Item[]>([]);
  const [production, setProduction] = useState<ProductionState>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Добавление из справочника номенклатуры
  const [pickPositionId, setPickPositionId] = useState("");
  const addFromCatalog = () => {
    const p = positions.find((x) => x.id === pickPositionId);
    if (!p) return;
    setItems((cur) => [...cur, { key: makeKey(), name: p.name, quantity: "1", unit: p.unit }]);
    setPickPositionId("");
  };

  // Добавление произвольной позиции
  const addCustom = () => {
    setItems((cur) => [...cur, { key: makeKey(), name: "", quantity: "1", unit: "шт" }]);
  };

  const removeItem = (key: string) => setItems((cur) => cur.filter((i) => i.key !== key));

  const updateItem = (key: string, patch: Partial<Item>) =>
    setItems((cur) => cur.map((i) => (i.key === key ? { ...i, ...patch } : i)));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const body = {
      title: title.trim(),
      description: description.trim() || null,
      ...production,
      items: items
        .filter((i) => i.name.trim().length > 0)
        .map((i) => ({
          name: i.name.trim(),
          quantity: Number(i.quantity) || 1,
          unit: i.unit.trim() || "шт",
        })),
    };

    const res = await fetch("/api/portal/requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    setSubmitting(false);

    if (!res.ok) {
      setError(data?.error ?? "Не удалось создать заявку");
      return;
    }
    router.push(`/portal/requests/${data.id}`);
    router.refresh();
  }

  return (
    <div className="p-4 lg:p-6 max-w-3xl mx-auto">
      <Link href="/portal" className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800">
        <ArrowLeft className="h-4 w-4" /> К списку
      </Link>

      <h1 className="text-lg font-semibold text-slate-900 mb-4">Новая заявка</h1>

      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="title">Название заявки *</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={500} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="desc">Описание</Label>
            <Textarea id="desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} maxLength={2000} />
          </div>
        </div>

        {/* Производство — клиент сам отмечает, какие операции ему нужны.
            Поля «материал» (hasMetal/metalOwner) не показываем — это внутренняя
            кухня закупок, см. PORTAL_PRODUCTION_FIELDS в lib/utils.ts. */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
          <h2 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
            <Factory className="h-4 w-4 text-slate-400" /> Производство
          </h2>
          <p className="text-xs text-slate-500 -mt-1">
            Какие операции вам нужны. Можно оставить «—» — менеджер уточнит.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {PORTAL_PRODUCTION_FIELDS.map((f) => {
              const current = (production[f.key as keyof ProductionState] as string | null | undefined) ?? null;
              const opt = current ? f.options.find((o) => o.value === current) : null;
              return (
                <div key={f.key} className="space-y-1">
                  <p className="text-xs font-medium text-slate-500">{f.label}</p>
                  <Select
                    value={current ?? "__none__"}
                    onValueChange={(v) =>
                      setProduction((cur) => ({
                        ...cur,
                        [f.key]: v === "__none__" ? null : v,
                      }))
                    }
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
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-800">Позиции</h2>
          </div>

          {/* Из номенклатуры */}
          <div className="flex flex-wrap gap-2">
            <select
              value={pickPositionId}
              onChange={(e) => setPickPositionId(e.target.value)}
              className="flex h-10 flex-1 min-w-45 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">— из моей номенклатуры —</option>
              {positions.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.unit})
                </option>
              ))}
            </select>
            <Button type="button" variant="outline" onClick={addFromCatalog} disabled={!pickPositionId}>
              <Plus className="mr-1 h-4 w-4" /> Добавить
            </Button>
          </div>

          <div className="text-center text-xs text-slate-400">или</div>

          <Button type="button" variant="outline" onClick={addCustom} className="w-full">
            <Plus className="mr-1 h-4 w-4" /> Своя позиция
          </Button>

          {items.length > 0 && (
            <ul className="space-y-2 pt-2">
              {items.map((it) => (
                <li key={it.key} className="grid grid-cols-12 gap-2 items-start">
                  <div className="col-span-12 sm:col-span-7">
                    <Input
                      placeholder="Название"
                      value={it.name}
                      onChange={(e) => updateItem(it.key, { name: e.target.value })}
                    />
                  </div>
                  <div className="col-span-6 sm:col-span-2">
                    <Input
                      type="number"
                      step="any"
                      min="0"
                      placeholder="Кол-во"
                      value={it.quantity}
                      onChange={(e) => updateItem(it.key, { quantity: e.target.value })}
                    />
                  </div>
                  <div className="col-span-5 sm:col-span-2">
                    <Input
                      placeholder="Ед."
                      value={it.unit}
                      onChange={(e) => updateItem(it.key, { unit: e.target.value })}
                    />
                  </div>
                  <div className="col-span-1 flex justify-end">
                    <Button type="button" size="icon" variant="ghost" onClick={() => removeItem(it.key)}>
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex items-center justify-end gap-2">
          <Link href="/portal">
            <Button type="button" variant="ghost">Отмена</Button>
          </Link>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Отправка..." : "Отправить заявку"}
          </Button>
        </div>
      </form>
    </div>
  );
}
