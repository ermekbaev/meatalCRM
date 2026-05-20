"use client";
import { useMemo, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check, ChevronDown, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  value: string;
  onChange: (next: string) => void;
  options: string[];
  placeholder?: string;
  className?: string;
};

export function Combobox({ value, onChange, options, placeholder, className }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const trimmed = query.trim();
  const filtered = useMemo(() => {
    if (!trimmed) return options;
    const needle = trimmed.toLowerCase();
    return options.filter((o) => o.toLowerCase().includes(needle));
  }, [options, trimmed]);

  const canCreate =
    trimmed.length > 0 && !options.some((o) => o.toLowerCase() === trimmed.toLowerCase());

  const select = (next: string) => {
    onChange(next);
    setQuery("");
    setOpen(false);
  };

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setQuery("");
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex h-9 w-full items-center justify-between gap-2 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500",
            className,
          )}
        >
          <span className={cn("truncate", !value && "text-gray-400")}>
            {value || placeholder || "Выберите"}
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-(--radix-popover-trigger-width) p-1" align="start">
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && canCreate) {
              e.preventDefault();
              select(trimmed);
            }
          }}
          placeholder="Поиск или ввод..."
          className="mb-1 w-full rounded-sm border border-gray-200 px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <div className="max-h-56 overflow-y-auto">
          {filtered.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => select(option)}
              className="flex w-full items-center rounded-sm px-2 py-1.5 text-sm hover:bg-gray-100"
            >
              <Check
                className={cn("mr-2 h-4 w-4 text-blue-600", value === option ? "" : "opacity-0")}
              />
              {option}
            </button>
          ))}
          {canCreate && (
            <button
              type="button"
              onClick={() => select(trimmed)}
              className="flex w-full items-center rounded-sm px-2 py-1.5 text-sm hover:bg-gray-100"
            >
              <Plus className="mr-2 h-4 w-4 text-blue-600" />
              Добавить «{trimmed}»
            </button>
          )}
          {filtered.length === 0 && !canCreate && (
            <p className="px-2 py-1.5 text-sm text-gray-400">Ничего не найдено</p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
