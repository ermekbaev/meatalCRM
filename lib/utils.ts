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
  NEW:              "Новая",
  PENDING_APPROVAL: "На согласовании",
  IN_PROGRESS:      "В работе",
  READY:            "Готово",
  COMPLETED:        "Завершена",
  CANCELLED:        "Отменена",
};

export const REQUEST_STATUS_COLORS: Record<string, string> = {
  NEW:              "bg-blue-50    text-blue-700    ring-1 ring-blue-200",
  PENDING_APPROVAL: "bg-purple-50  text-purple-700  ring-1 ring-purple-200",
  IN_PROGRESS:      "bg-amber-50   text-amber-700   ring-1 ring-amber-200",
  READY:            "bg-teal-50    text-teal-700    ring-1 ring-teal-200",
  COMPLETED:        "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
  CANCELLED:        "bg-red-50     text-red-600     ring-1 ring-red-200",
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

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  NONE:    "Без оплаты",
  WAITING: "Ждём оплату",
  PAID:    "Оплачено",
};

export const PAYMENT_STATUS_COLORS: Record<string, string> = {
  NONE:    "",
  WAITING: "bg-amber-50  text-amber-700  ring-1 ring-amber-200",
  PAID:    "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
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
  FOREMAN: "Мастер цеха",
  ENGINEER: "Конструктор/Инженер",
  EMPLOYEE: "Оператор",
  CONTRACTOR: "Подрядчик",
};

export const CLIENT_TYPE_LABELS: Record<string, string> = {
  INDIVIDUAL: "Физ. лицо",
  COMPANY: "Юр. лицо",
};

// Используется для подзадач (enum TaskStatus). Статусы задач теперь динамические — см. TaskColumn.
export const TASK_STATUS_LABELS: Record<string, string> = {
  TODO:             "К выполнению",
  PENDING_APPROVAL: "На согласовании",
  IN_PROGRESS:      "В работе",
  DONE:             "Выполнено",
  CANCELLED:        "Отменено",
};

export const TASK_STATUS_COLORS: Record<string, string> = {
  TODO:             "bg-slate-100  text-slate-600  ring-1 ring-slate-200",
  PENDING_APPROVAL: "bg-purple-50  text-purple-700 ring-1 ring-purple-200",
  IN_PROGRESS:      "bg-amber-50   text-amber-700  ring-1 ring-amber-200",
  DONE:             "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
  CANCELLED:        "bg-red-50     text-red-600    ring-1 ring-red-200",
};

// Превращает HEX-цвет колонки задач в стили для бейджа (бледный фон + цветной текст + рамка)
export function hexToBadgeStyle(hex: string): { backgroundColor: string; color: string; boxShadow: string } {
  const clean = (hex || "#94a3b8").replace("#", "");
  const normalized = clean.length === 3
    ? clean.split("").map((c) => c + c).join("")
    : clean.padEnd(6, "0").slice(0, 6);
  return {
    backgroundColor: `#${normalized}1f`,
    color: `#${normalized}`,
    boxShadow: `inset 0 0 0 1px #${normalized}55`,
  };
}

// Производственные статусы позиций заявки
export type ProductionFieldKey =
  | "hasMetal"
  | "metalOwner"
  | "laserStatus"
  | "bendingStatus"
  | "paintingStatus"
  | "sandblastingStatus"
  | "extraWorkStatus"
  | "deliveryStatus";

export const PRODUCTION_FIELDS: Array<{
  key: ProductionFieldKey;
  label: string;
  short: string;
  options: Array<{ value: string; label: string; className: string }>;
}> = [
  {
    key: "hasMetal",
    label: "Металл",
    short: "М",
    options: [
      { value: "ЕСТЬ", label: "ЕСТЬ", className: "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200" },
      { value: "НЕТ",  label: "НЕТ",  className: "bg-red-100     text-red-700     ring-1 ring-red-200" },
    ],
  },
  {
    key: "metalOwner",
    label: "Чей металл",
    short: "Ч",
    options: [
      { value: "НАШ", label: "НАШ", className: "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200" },
      { value: "ЗАК", label: "ЗАК", className: "bg-amber-100   text-amber-700   ring-1 ring-amber-200" },
    ],
  },
  {
    key: "laserStatus",
    label: "Лазер",
    short: "Л",
    options: [
      { value: "ДА",   label: "ДА",   className: "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200" },
      { value: "НЕТ",  label: "НЕТ",  className: "bg-red-100     text-red-700     ring-1 ring-red-200" },
    ],
  },
  {
    key: "bendingStatus",
    label: "Гибка",
    short: "Г",
    options: [
      { value: "ДА",   label: "ДА",   className: "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200" },
      { value: "НЕТ",  label: "НЕТ",  className: "bg-red-100     text-red-700     ring-1 ring-red-200" },
    ],
  },
  {
    key: "paintingStatus",
    label: "Покраска",
    short: "П",
    options: [
      { value: "ДА",  label: "ДА",  className: "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200" },
      { value: "НЕТ", label: "НЕТ", className: "bg-red-100     text-red-700     ring-1 ring-red-200" },
    ],
  },
  {
    key: "sandblastingStatus",
    label: "Пескоструй",
    short: "ПС",
    options: [
      { value: "ДА",  label: "ДА",  className: "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200" },
      { value: "НЕТ", label: "НЕТ", className: "bg-red-100     text-red-700     ring-1 ring-red-200" },
    ],
  },
  {
    key: "extraWorkStatus",
    label: "Доп. работы",
    short: "Д",
    options: [
      { value: "ДА",   label: "ДА",   className: "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200" },
      { value: "НЕТ",  label: "НЕТ",  className: "bg-red-100     text-red-700     ring-1 ring-red-200" },
      { value: "ВЫСТ", label: "ВЫСТ", className: "bg-orange-100  text-orange-700  ring-1 ring-orange-200" },
    ],
  },
  {
    key: "deliveryStatus",
    label: "Доставка",
    short: "🚚",
    options: [
      { value: "ДА",   label: "ДА",   className: "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200" },
      { value: "НЕТ",  label: "НЕТ",  className: "bg-red-100     text-red-700     ring-1 ring-red-200" },
      { value: "ВЫСТ", label: "ВЫСТ", className: "bg-orange-100  text-orange-700  ring-1 ring-orange-200" },
    ],
  },
];

// Подмножество производственных статусов, доступных на уровне задачи
export const TASK_PRODUCTION_FIELDS = PRODUCTION_FIELDS.filter((f) =>
  ["laserStatus", "bendingStatus", "paintingStatus", "sandblastingStatus"].includes(f.key)
);

export const CHANGELOG_FIELD_LABELS: Record<string, string> = {
  status:     "Статус",
  priority:   "Приоритет",
  title:      "Название",
  assigneeId: "Ответственный",
  amount:     "Сумма",
  // Поля задач
  assignee:           "Исполнитель",
  dueDate:            "Срок",
  workshop:           "Цех",
  laserStatus:        "Лазер",
  bendingStatus:      "Гибка",
  paintingStatus:     "Покраска",
  sandblastingStatus: "Пескоструй",
};

export const CHANGELOG_VALUE_LABELS: Record<string, string> = {
  // Статусы заявок
  NEW:         "Новая",
  IN_PROGRESS: "В работе",
  COMPLETED:   "Выполнено",
  CANCELLED:   "Отменено",
  // Приоритеты
  LOW:    "Низкий",
  MEDIUM: "Средний",
  HIGH:   "Высокий",
  URGENT: "Срочный",
};
