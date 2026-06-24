/**
 * Минимальные shape-типы для входов PDF-генераторов.
 *
 * Поля документируют реальные обращения внутри `lib/pdf.ts`, `lib/invoice-pdf.ts`,
 * `lib/production-pdf.ts`. Все поля делаем опциональными там, где генератор
 * проверяет наличие через `?? "—"` или `?.`. Это не полная Prisma-модель —
 * только то, что PDF фактически читает (минимизирует связность).
 */

/**
 * Режим вывода генераторов PDF:
 *  - "save"    — скачать файл (поведение по умолчанию);
 *  - "bloburl" — не скачивать, вернуть blob-URL для предпросмотра в модалке.
 */
export type PdfOutput = "save" | "bloburl";

export type CompanyForPdf = {
  name?: string | null;
  shortName?: string | null;
  inn?: string | null;
  kpp?: string | null;
  ogrn?: string | null;
  legalAddress?: string | null;
  postalAddress?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  bankName?: string | null;
  bankAccount?: string | null;
  bankBik?: string | null;
  bankCorAccount?: string | null;
  director?: string | null;
  accountantName?: string | null;
  logoImage?: string | null;
  stampImage?: string | null;
  signatureImage?: string | null;
};

export type OfferItemForPdf = {
  service: string;
  description?: string | null;
  quantity: number;
  unit: string;
  price: number;
  total: number;
};

export type ClientForPdf = {
  name: string;
  shortName?: string | null;
  inn?: string | null;
  kpp?: string | null;
  legalAddress?: string | null;
  postalAddress?: string | null;
};

export type OfferForPdf = {
  number: number;
  // На превью из форм может прилетать строкой; PDF сам её не парсит — просто вставляет.
  numberOverride?: number | string | null;
  createdAt: Date | string;
  validUntil?: Date | string | null;
  discount: number;
  vatRate: number;
  items: OfferItemForPdf[];
  client?: ClientForPdf | null;
  request?: { client?: ClientForPdf | null } | null;
  manager?: { name?: string | null; phone?: string | null; email?: string | null } | null;
  managerCustom?: string | null;
  createdBy?: { name?: string | null; phone?: string | null; email?: string | null } | null;
  deliveryTerms?: string | null;
  notes?: string | null;
};

export type InvoiceItemForPdf = {
  name: string;
  quantity: number;
  unit: string;
  price: number;
  total: number;
};

export type InvoiceForPdf = {
  number: number;
  numberOverride?: number | null;
  date: Date | string;
  dueDate?: Date | string | null;
  vatRate?: number | null;
  basis?: string | null;
  notes?: string | null;
  client: ClientForPdf;
  items: InvoiceItemForPdf[];
  request?: { number: number; title?: string | null } | null;
  createdBy?: { name?: string | null; phone?: string | null; email?: string | null } | null;
};

export type SubtaskForPdf = {
  id: string;
  title?: string | null;
  description?: string | null;
  status?: string | null;
  priority?: string | null;
  quantity?: number | null;
  unit?: string | null;
  dueDate?: Date | string | null;
  assignee?: { name?: string | null } | null;
};

export type TaskForPdf = {
  id: string;
  title: string;
  description?: string | null;
  status?: string | null;
  priority?: string | null;
  dueDate?: Date | string | null;
  createdAt?: Date | string | null;
  workshop?: { name?: string | null } | null;
  client?: { name?: string | null; shortName?: string | null } | null;
  assignees?: Array<{ name?: string | null }>;
  // Легаси: одиночный assignee (до перехода на массив).
  assignee?: { name?: string | null } | null;
  subtasks?: SubtaskForPdf[];
};
