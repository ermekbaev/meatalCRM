"use client";
import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Loader2 } from "lucide-react";

interface RevenueRequest {
  id: string;
  number: number;
  title: string;
  amount: number;
  updatedAt: string;
  client: { name: string };
}

interface RevenueDetailModalProps {
  open: boolean;
  onClose: () => void;
}

export function RevenueDetailModal({ open, onClose }: RevenueDetailModalProps) {
  const [requests, setRequests] = useState<RevenueRequest[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetch("/api/dashboard/revenue")
      .then((r) => r.json())
      .then((data) => {
        setRequests(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [open]);

  const total = requests.reduce((sum, r) => sum + (r.amount ?? 0), 0);

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Выручка — завершённые заявки</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto min-h-0">
          {loading ? (
            <div className="flex h-40 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : requests.length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-400">Нет завершённых заявок с суммой</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="px-4 py-2 text-left text-xs font-medium text-slate-500">#</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-slate-500">Название</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-slate-500">Клиент</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-slate-500">Сумма</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-slate-500">Дата</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {requests.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-50/60">
                    <td className="px-4 py-2 font-mono text-xs text-slate-400">{req.number}</td>
                    <td className="px-4 py-2 text-slate-800 max-w-[200px] truncate">{req.title}</td>
                    <td className="px-4 py-2 text-slate-500 max-w-40 truncate">{req.client?.name}</td>
                    <td className="px-4 py-2 text-right font-medium text-slate-800">{formatCurrency(req.amount)}</td>
                    <td className="px-4 py-2 text-right text-slate-400 whitespace-nowrap">{formatDate(req.updatedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {!loading && requests.length > 0 && (
          <div className="border-t border-slate-100 pt-3 flex items-center justify-between">
            <span className="text-sm text-slate-500">Итого ({requests.length} заявок):</span>
            <span className="text-lg font-bold text-teal-700">{formatCurrency(total)}</span>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Закрыть</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
