"use client";
import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { ChevronDown, X } from "lucide-react";

type User = { id: string; name: string; position?: string | null; role?: string };

export function AssigneeSearchPicker({
  users,
  value,
  onChange,
  placeholder = "Не назначен",
  allowNone = true,
  disabled,
}: {
  users: User[];
  value: string | null;
  onChange: (id: string | null) => void;
  placeholder?: string;
  allowNone?: boolean;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const selected = users.find((u) => u.id === value);
  const ql = q.trim().toLowerCase();
  const filtered = users.filter((u) =>
    !ql
      ? true
      : u.name.toLowerCase().includes(ql) || (u.position ?? "").toLowerCase().includes(ql)
  );
  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (!o) setQ(""); }}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className="flex w-full items-center justify-between rounded-md border border-input bg-white px-3 py-2 text-sm h-9 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
        >
          <span className={`truncate ${selected ? "text-slate-900" : "text-slate-400"}`}>
            {selected ? selected.name : placeholder}
          </span>
          <ChevronDown className="h-4 w-4 text-slate-400 shrink-0 ml-2" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[280px] p-2">
        <Input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Поиск..."
          className="h-7 text-xs mb-2"
        />
        <div className="space-y-0.5 max-h-60 overflow-y-auto">
          {allowNone && (
            <button
              type="button"
              onClick={() => { onChange(null); setOpen(false); }}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs hover:bg-slate-50 text-slate-500"
            >
              <X className="h-3 w-3" /> Не назначен
            </button>
          )}
          {filtered.length === 0 && (
            <p className="px-2 py-1 text-xs text-slate-400">
              {ql ? "Ничего не найдено" : "Нет пользователей"}
            </p>
          )}
          {filtered.map((u) => (
            <button
              key={u.id}
              type="button"
              onClick={() => { onChange(u.id); setOpen(false); }}
              className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-slate-50 ${value === u.id ? "bg-slate-50" : ""}`}
            >
              <div className="h-6 w-6 shrink-0 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[10px] font-medium">
                {u.name.charAt(0).toUpperCase()}
              </div>
              <span className="flex-1 min-w-0">
                <span className="block truncate text-slate-800">{u.name}</span>
                {u.position && (
                  <span className="block truncate text-[10px] text-slate-400">{u.position}</span>
                )}
              </span>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
