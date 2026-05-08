"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { Bell, BellRing, Check } from "lucide-react";
import { formatDateTime } from "@/lib/utils";

type Notification = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  isRead: boolean;
  createdAt: string;
};

const POLL_INTERVAL_MS = 30_000;

export function NotificationsBell() {
  const [items, setItems] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchAll = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications?limit=10");
      if (!res.ok) return;
      const data = await res.json();
      setItems(data.items ?? []);
      setUnread(data.unreadCount ?? 0);
    } catch {}
  }, []);

  const fetchUnread = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications/unread");
      if (!res.ok) return;
      const data = await res.json();
      setUnread(data.count ?? 0);
    } catch {}
  }, []);

  useEffect(() => {
    fetchAll();
    const t = setInterval(fetchUnread, POLL_INTERVAL_MS);
    return () => clearInterval(t);
  }, [fetchAll, fetchUnread]);

  useEffect(() => {
    if (!open) return;
    fetchAll();
    const onClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open, fetchAll]);

  const markRead = async (id: string) => {
    setItems((prev) => prev.map((i) => i.id === id ? { ...i, isRead: true } : i));
    setUnread((u) => Math.max(0, u - 1));
    await fetch(`/api/notifications/${id}/read`, { method: "POST" }).catch(() => {});
  };

  const markAllRead = async () => {
    if (unread === 0) return;
    setItems((prev) => prev.map((i) => ({ ...i, isRead: true })));
    setUnread(0);
    await fetch("/api/notifications/read-all", { method: "POST" }).catch(() => {});
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
        title="Уведомления"
      >
        {unread > 0 ? <BellRing className="h-5 w-5 text-orange-500" /> : <Bell className="h-5 w-5" />}
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 max-w-[90vw] rounded-xl border border-slate-200 bg-white shadow-lg z-50">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <h3 className="text-sm font-semibold text-slate-800">Уведомления</h3>
            {unread > 0 && (
              <button
                onClick={markAllRead}
                className="text-[11px] text-slate-500 hover:text-slate-800 inline-flex items-center gap-1"
              >
                <Check className="h-3 w-3" /> Все прочитано
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {items.length === 0 ? (
              <p className="p-6 text-center text-sm text-slate-400">Пока нет уведомлений</p>
            ) : (
              items.map((n) => {
                const Body = (
                  <div
                    className={`px-4 py-3 border-b border-slate-50 hover:bg-slate-50 transition-colors ${
                      n.isRead ? "" : "bg-orange-50/30"
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {!n.isRead && (
                        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-orange-500" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800">{n.title}</p>
                        {n.body && (
                          <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{n.body}</p>
                        )}
                        <p className="text-[10px] text-slate-400 mt-1">{formatDateTime(n.createdAt)}</p>
                      </div>
                    </div>
                  </div>
                );

                return n.link ? (
                  <Link
                    key={n.id}
                    href={n.link}
                    onClick={() => { markRead(n.id); setOpen(false); }}
                    className="block"
                  >
                    {Body}
                  </Link>
                ) : (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => markRead(n.id)}
                    className="block w-full text-left"
                  >
                    {Body}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
