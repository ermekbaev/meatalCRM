"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

/**
 * Форма ответа менеджера/админа в тред портальной заявки.
 * POST /api/portal/requests/[id]/comments — общий endpoint клиент+внутренние.
 * После успешной отправки router.refresh() перечитает серверный компонент
 * с обновлённым списком комментариев.
 */
export function PortalCommentForm({ requestId }: { requestId: string }) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const value = text.trim();
    if (!value || sending) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch(`/api/portal/requests/${requestId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: value }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data?.error ?? `Не удалось отправить (HTTP ${res.status})`);
        return;
      }
      setText("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Сетевая ошибка");
    } finally {
      setSending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-2">
      <Textarea
        placeholder="Написать сообщение клиенту..."
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={2}
        maxLength={5000}
      />
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </div>
      )}
      <div className="flex justify-end">
        <Button type="submit" size="sm" disabled={!text.trim() || sending}>
          {sending ? "Отправка..." : "Отправить"}
        </Button>
      </div>
    </form>
  );
}
