"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PORTAL_PAYMENT_OPTIONS, type PortalPaymentStatus } from "@/lib/utils";

/**
 * Платёжный подстатус заявки. Меняет только внутренний пользователь;
 * клиент видит результат как read-only бейдж (см. PortalRequestView).
 */
export function PortalPaymentPicker({
  requestId,
  initial,
}: {
  requestId: string;
  initial: PortalPaymentStatus;
}) {
  const router = useRouter();
  const [value, setValue] = useState<PortalPaymentStatus>(initial);
  const [saving, setSaving] = useState(false);

  async function update(next: PortalPaymentStatus) {
    const prev = value;
    setValue(next);
    setSaving(true);
    const res = await fetch(`/api/portal/requests/${requestId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentStatus: next }),
    });
    setSaving(false);
    if (!res.ok) {
      setValue(prev);
      return;
    }
    router.refresh();
  }

  const current = PORTAL_PAYMENT_OPTIONS.find((o) => o.value === value)!;

  return (
    <Select value={value} onValueChange={(v) => update(v as PortalPaymentStatus)} disabled={saving}>
      <SelectTrigger
        className={`h-7 w-auto min-w-32 px-2.5 text-xs rounded-full font-medium border-0 shadow-none ${current.className}`}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {PORTAL_PAYMENT_OPTIONS.map((o) => (
          <SelectItem key={o.value} value={o.value} className="text-xs">
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
