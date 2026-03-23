import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format } from "date-fns";
import { ru } from "date-fns/locale";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "—";
  return format(new Date(date), "dd.MM.yyyy", { locale: ru });
}

export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return "—";
  return format(new Date(date), "dd.MM.yyyy HH:mm", { locale: ru });
}

export function formatCurrency(value: number | null | undefined): string {
  if (value == null) return "—";
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  }).format(value);
}

export const REQUEST_STATUS_LABELS: Record<string, string> = {
  NEW: "Новая",
  IN_PROGRESS: "В работе",
  COMPLETED: "Завершена",
  CANCELLED: "Отменена",
};

export const REQUEST_STATUS_COLORS: Record<string, string> = {
  NEW:         "bg-blue-50    text-blue-700    ring-1 ring-blue-200",
  IN_PROGRESS: "bg-amber-50   text-amber-700   ring-1 ring-amber-200",
  COMPLETED:   "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
  CANCELLED:   "bg-red-50     text-red-600     ring-1 ring-red-200",
};

export const PRIORITY_LABELS: Record<string, string> = {
  LOW: "Низкий",
  MEDIUM: "Средний",
  HIGH: "Высокий",
  URGENT: "Срочный",
};

export const PRIORITY_COLORS: Record<string, string> = {
  LOW:    "bg-slate-100 text-slate-500 ring-1 ring-slate-200",
  MEDIUM: "bg-slate-200 text-slate-600 ring-1 ring-slate-300",
  HIGH:   "bg-orange-50 text-orange-700 ring-1 ring-orange-200",
  URGENT: "bg-red-50    text-red-600   ring-1 ring-red-200",
};

export const OFFER_STATUS_LABELS: Record<string, string> = {
  DRAFT: "Черновик",
  SENT: "Отправлено",
  ACCEPTED: "Принято",
  REJECTED: "Отклонено",
};

export const OFFER_STATUS_COLORS: Record<string, string> = {
  DRAFT:    "bg-slate-100  text-slate-600  ring-1 ring-slate-200",
  SENT:     "bg-blue-50    text-blue-700   ring-1 ring-blue-200",
  ACCEPTED: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
  REJECTED: "bg-red-50     text-red-600    ring-1 ring-red-200",
};

export const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Администратор",
  MANAGER: "Менеджер",
  EMPLOYEE: "Сотрудник",
};

export const CLIENT_TYPE_LABELS: Record<string, string> = {
  INDIVIDUAL: "Физ. лицо",
  COMPANY: "Юр. лицо",
};

export const TASK_STATUS_LABELS: Record<string, string> = {
  TODO:        "К выполнению",
  IN_PROGRESS: "В работе",
  DONE:        "Выполнено",
  CANCELLED:   "Отменено",
};

export const TASK_STATUS_COLORS: Record<string, string> = {
  TODO:        "bg-slate-100  text-slate-600  ring-1 ring-slate-200",
  IN_PROGRESS: "bg-amber-50   text-amber-700  ring-1 ring-amber-200",
  DONE:        "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
  CANCELLED:   "bg-red-50     text-red-600    ring-1 ring-red-200",
};
