"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Package } from "lucide-react";

/**
 * Кнопка-чип «Отгружено» для менеджера: toggle, шлёт `{ shipped: bool }`.
 * Сервер пишет shippedAt = now() или null.
 */
export function PortalShippedToggle({
  requestId,
  initial,
}: {
  requestId: string;
  initial: boolean;
}) {
  const router = useRouter();
  const [shipped, setShipped] = useState(initial);
  const [saving, setSaving] = useState(false);

  async function toggle() {
    const next = !shipped;
    setShipped(next);
    setSaving(true);
    const res = await fetch(`/api/portal/requests/${requestId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shipped: next }),
    });
    setSaving(false);
    if (!res.ok) {
      setShipped(!next);
      return;
    }
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={saving}
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
        shipped
          ? "bg-sky-100 text-sky-700 hover:bg-sky-200"
          : "bg-slate-50 text-slate-500 ring-1 ring-slate-200 hover:bg-slate-100"
      } disabled:opacity-60`}
      title={shipped ? "Снять отметку «отгружено»" : "Отметить как отгружено"}
    >
      <Package className="h-3 w-3" />
      {shipped ? "Отгружено" : "Не отгружено"}
    </button>
  );
}
