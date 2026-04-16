"use client";
import { useEffect, useRef, useState } from "react";
import { Search, Building2, X, Loader2, PlusCircle } from "lucide-react";
import { Input } from "@/components/ui/input";

interface ExistingClient {
  id: string;
  name: string;
  shortName?: string | null;
  inn?: string | null;
}

interface Props {
  value: string;
  onChange: (clientId: string) => void;
  existingClients: ExistingClient[];
}

export function ClientSearchInput({ value, onChange, existingClients }: Props) {
  const [query, setQuery] = useState("");
  const [localResults, setLocalResults] = useState<ExistingClient[]>([]);
  const [dadataResults, setDadataResults] = useState<any[]>([]);
  const [dadataLoading, setDadataLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedLabel, setSelectedLabel] = useState("");

  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!value) {
      setSelectedLabel("");
      return;
    }
    const found = existingClients.find((c) => c.id === value);
    if (found) setSelectedLabel(found.shortName || found.name);
  }, [value, existingClients]);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function handleQueryChange(q: string) {
    setQuery(q);

    if (!q.trim()) {
      setLocalResults(existingClients.slice(0, 8));
      setDadataResults([]);
      setShowDropdown(true);
      return;
    }

    const lower = q.toLowerCase();
    setLocalResults(
      existingClients.filter(
        (c) =>
          c.name.toLowerCase().includes(lower) ||
          (c.shortName ?? "").toLowerCase().includes(lower) ||
          (c.inn ?? "").includes(q)
      )
    );

    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (q.trim().length < 2) {
      setDadataResults([]);
      setShowDropdown(true);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setDadataLoading(true);
      try {
        const res = await fetch("/api/dadata/party", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: q.trim() }),
        });
        const data = await res.json();
        setDadataResults(data?.suggestions ?? []);
      } catch {
        setDadataResults([]);
      } finally {
        setDadataLoading(false);
      }
    }, 350);

    setShowDropdown(true);
  }

  function selectExisting(client: ExistingClient) {
    onChange(client.id);
    setSelectedLabel(client.shortName || client.name);
    setQuery("");
    setShowDropdown(false);
    setDadataResults([]);
  }

  async function selectFromDadata(suggestion: any) {
    const d = suggestion.data;
    const name = d.name?.full_with_opf ?? suggestion.value ?? "";
    const shortName = d.name?.short_with_opf ?? "";

    setCreating(true);
    setShowDropdown(false);
    try {
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "COMPANY",
          name,
          shortName,
          inn: d.inn ?? "",
          kpp: d.kpp ?? "",
          ogrn: d.ogrn ?? "",
          legalAddress: d.address?.value ?? "",
          director: d.management?.name ?? "",
        }),
      });
      if (!res.ok) throw new Error();
      const created = await res.json();
      onChange(created.id);
      setSelectedLabel(shortName || name);
      setQuery("");
      setDadataResults([]);
    } catch {
      alert("Не удалось создать контрагента. Попробуйте ещё раз.");
    } finally {
      setCreating(false);
    }
  }

  function clear() {
    onChange("");
    setSelectedLabel("");
    setQuery("");
    setDadataResults([]);
  }

  const existingInns = new Set(existingClients.map((c) => c.inn).filter(Boolean));
  const newDadataResults = dadataResults.filter((s) => !existingInns.has(s.data?.inn));
  const hasResults = localResults.length > 0 || newDadataResults.length > 0 || dadataLoading;

  return (
    <div className="relative" ref={containerRef}>
      {value && selectedLabel ? (
        <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 min-h-[40px]">
          <div className="flex items-center gap-2 min-w-0">
            <Building2 className="h-3.5 w-3.5 shrink-0 text-slate-400" />
            <span className="text-sm font-medium text-slate-800 truncate">{selectedLabel}</span>
          </div>
          <button
            type="button"
            onClick={clear}
            className="ml-2 shrink-0 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <>
          <div className="relative">
            {creating ? (
              <Loader2 className="absolute left-2.5 top-2.5 h-3.5 w-3.5 animate-spin text-slate-400" />
            ) : (
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
            )}
            <Input
              value={query}
              onChange={(e) => handleQueryChange(e.target.value)}
              onFocus={() => {
                if (!query.trim()) setLocalResults(existingClients.slice(0, 8));
                setShowDropdown(true);
              }}
              placeholder={creating ? "Создание контрагента..." : "Поиск по названию или ИНН..."}
              className="pl-8 text-sm"
              disabled={creating}
            />
          </div>

          {showDropdown && hasResults && (
            <div className="absolute z-30 mt-1 w-full rounded-lg border border-slate-200 bg-white shadow-lg max-h-72 overflow-y-auto">
              {localResults.length > 0 && (
                <>
                  <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400 bg-slate-50 border-b border-slate-100">
                    В системе
                  </div>
                  {localResults.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-slate-50 text-left"
                      onMouseDown={() => selectExisting(c)}
                    >
                      <Building2 className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                      <div className="min-w-0">
                        <p className="truncate text-sm text-slate-800">{c.shortName || c.name}</p>
                        {c.inn && <p className="text-[11px] text-slate-400">ИНН {c.inn}</p>}
                      </div>
                    </button>
                  ))}
                </>
              )}

              {(newDadataResults.length > 0 || dadataLoading) && (
                <>
                  <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400 bg-slate-50 border-b border-slate-100 border-t">
                    Найти в dadata{dadataLoading && <Loader2 className="inline h-3 w-3 animate-spin ml-1" />}
                  </div>
                  {newDadataResults.map((s, i) => {
                    const d = s.data;
                    const label = d.name?.short_with_opf ?? s.value ?? "";
                    const inn = d.inn ?? "";
                    const address = d.address?.value ?? "";
                    return (
                      <button
                        key={i}
                        type="button"
                        className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-orange-50 text-left group"
                        onMouseDown={() => selectFromDadata(s)}
                      >
                        <PlusCircle className="h-3.5 w-3.5 shrink-0 text-orange-400 group-hover:text-orange-500" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm text-slate-800">{label}</p>
                          <p className="text-[11px] text-slate-400 truncate">
                            {inn && <>ИНН {inn}{address ? " · " : ""}</>}
                            {address}
                          </p>
                        </div>
                        <span className="shrink-0 text-[10px] text-orange-400 font-medium">Добавить</span>
                      </button>
                    );
                  })}
                </>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
