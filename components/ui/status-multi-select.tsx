"use client";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check, ChevronDown } from "lucide-react";

export type StatusOption = { key: string; label: string };

type Props = {
  value: string[];
  onChange: (next: string[]) => void;
  options: StatusOption[];
  allLabel?: string;
  className?: string;
};

export function StatusMultiSelect({
  value,
  onChange,
  options,
  allLabel = "Все статусы",
  className,
}: Props) {
  const toggle = (k: string) =>
    onChange(value.includes(k) ? value.filter((v) => v !== k) : [...value, k]);

  const labelMap = new Map(options.map((o) => [o.key, o.label]));
  const label =
    value.length === 0
      ? allLabel
      : value.length === 1
      ? labelMap.get(value[0]) ?? allLabel
      : `Статусы: ${value.length}`;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={
            className ??
            "flex h-9 flex-1 sm:flex-none sm:w-40 min-w-0 items-center justify-between gap-2 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          }
        >
          <span className="truncate">{label}</span>
          <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-52 p-1" align="start">
        <button
          type="button"
          onClick={() => onChange([])}
          className="flex w-full items-center rounded-sm px-2 py-1.5 text-sm hover:bg-gray-100"
        >
          <Check className={`mr-2 h-4 w-4 text-blue-600 ${value.length === 0 ? "" : "opacity-0"}`} />
          {allLabel}
        </button>
        <div className="-mx-1 my-1 h-px bg-gray-100" />
        {options.map((o) => (
          <button
            key={o.key}
            type="button"
            onClick={() => toggle(o.key)}
            className="flex w-full items-center rounded-sm px-2 py-1.5 text-sm hover:bg-gray-100"
          >
            <Check className={`mr-2 h-4 w-4 text-blue-600 ${value.includes(o.key) ? "" : "opacity-0"}`} />
            {o.label}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}
