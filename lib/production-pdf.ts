import { PRIORITY_LABELS } from "./utils";

async function fetchColumnLabels(): Promise<Record<string, string>> {
  try {
    const res = await fetch("/api/task-columns");
    if (!res.ok) return {};
    const cols = await res.json();
    if (!Array.isArray(cols)) return {};
    return Object.fromEntries(cols.map((c: any) => [c.key, c.name]));
  } catch {
    return {};
  }
}

function fmtDate(d: Date | string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function escapeHtml(s: string) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildTaskHtml(task: any, company: any, statusLabels: Record<string, string>): string {
  const subtasks = (task.subtasks ?? []) as any[];
  const client = task.client;
  const workshop = task.workshop;

  const rowsHtml = subtasks.length === 0
    ? `<tr><td colspan="7" style="border:1px solid #000;padding:12px;text-align:center;color:#666;">Нет подзадач</td></tr>`
    : subtasks.map((s, i) => `
        <tr>
          <td style="border:1px solid #000;padding:6px;text-align:center;">${i + 1}</td>
          <td style="border:1px solid #000;padding:6px;">${escapeHtml(s.title ?? "")}</td>
          <td style="border:1px solid #000;padding:6px;text-align:center;">${s.quantity != null ? s.quantity : ""}</td>
          <td style="border:1px solid #000;padding:6px;text-align:center;">${s.unit ?? ""}</td>
          <td style="border:1px solid #000;padding:6px;">${escapeHtml(s.assignee?.name ?? "—")}</td>
          <td style="border:1px solid #000;padding:6px;text-align:center;">${PRIORITY_LABELS[s.priority] ?? s.priority}</td>
          <td style="border:1px solid #000;padding:6px;text-align:center;">${fmtDate(s.dueDate)}</td>
        </tr>`).join("");

  return `<div style="padding:28px 40px 40px 40px;">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #000;padding-bottom:8px;margin-bottom:14px;">
      <div>
        <h1 style="font-size:18px;font-weight:700;margin:0 0 4px 0;">Производственное задание</h1>
        <div style="font-size:11px;color:#444;">${escapeHtml(company?.name ?? "")}</div>
      </div>
      <div style="text-align:right;font-size:11px;">
        <div style="color:#666;">Дата печати</div>
        <div style="font-weight:600;">${fmtDate(new Date())}</div>
      </div>
    </div>

    <table style="width:100%;border-collapse:collapse;margin-bottom:12px;font-size:11px;">
      <tr>
        <td style="width:140px;padding:3px 0;color:#555;vertical-align:top;">Задача:</td>
        <td style="padding:3px 8px;font-weight:700;">${escapeHtml(task.title ?? "")}</td>
      </tr>
      ${client ? `
      <tr>
        <td style="padding:3px 0;color:#555;vertical-align:top;">Контрагент:</td>
        <td style="padding:3px 8px;">${escapeHtml(client.shortName ?? client.name ?? "")}</td>
      </tr>` : ""}
      ${workshop ? `
      <tr>
        <td style="padding:3px 0;color:#555;vertical-align:top;">Цех:</td>
        <td style="padding:3px 8px;">${escapeHtml(workshop.name ?? "")}</td>
      </tr>` : ""}
      <tr>
        <td style="padding:3px 0;color:#555;vertical-align:top;">Статус:</td>
        <td style="padding:3px 8px;">${statusLabels[task.status] ?? task.status}</td>
      </tr>
      <tr>
        <td style="padding:3px 0;color:#555;vertical-align:top;">Приоритет:</td>
        <td style="padding:3px 8px;">${PRIORITY_LABELS[task.priority] ?? task.priority}</td>
      </tr>
      ${(() => {
        const names = Array.isArray(task.assignees) && task.assignees.length > 0
          ? task.assignees.map((a: any) => a.name).filter(Boolean)
          : task.assignee?.name ? [task.assignee.name] : [];
        if (names.length === 0) return "";
        return `<tr>
          <td style="padding:3px 0;color:#555;vertical-align:top;">${names.length > 1 ? "Ответственные" : "Ответственный"}:</td>
          <td style="padding:3px 8px;">${escapeHtml(names.join(", "))}</td>
        </tr>`;
      })()}
      ${task.dueDate ? `
      <tr>
        <td style="padding:3px 0;color:#555;vertical-align:top;">Срок задачи:</td>
        <td style="padding:3px 8px;font-weight:600;">${fmtDate(task.dueDate)}</td>
      </tr>` : ""}
    </table>

    ${task.description ? `
    <div style="margin-bottom:12px;padding:8px;background:#f7f7f7;border-radius:4px;font-size:10.5px;white-space:pre-wrap;">
      ${escapeHtml(task.description)}
    </div>` : ""}

    <h3 style="font-size:13px;font-weight:700;margin:8px 0 6px 0;">Список позиций</h3>
    <table style="width:100%;border-collapse:collapse;font-size:10.5px;">
      <thead>
        <tr style="background:#f0f0f0;">
          <th style="border:1px solid #000;padding:5px 4px;width:32px;">№</th>
          <th style="border:1px solid #000;padding:5px 6px;text-align:left;">Название</th>
          <th style="border:1px solid #000;padding:5px 4px;width:60px;">Кол-во</th>
          <th style="border:1px solid #000;padding:5px 4px;width:48px;">Ед.</th>
          <th style="border:1px solid #000;padding:5px 6px;text-align:left;width:160px;">Исполнитель</th>
          <th style="border:1px solid #000;padding:5px 4px;width:90px;">Приоритет</th>
          <th style="border:1px solid #000;padding:5px 4px;width:90px;">Срок</th>
        </tr>
      </thead>
      <tbody>${rowsHtml}</tbody>
    </table>

    <div style="margin-top:36px;display:flex;gap:60px;">
      <div style="flex:1;">
        <div style="border-bottom:1px solid #000;height:34px;"></div>
        <div style="font-size:10px;color:#555;margin-top:4px;">Подпись мастера</div>
      </div>
      <div style="flex:1;">
        <div style="border-bottom:1px solid #000;height:34px;"></div>
        <div style="font-size:10px;color:#555;margin-top:4px;">Дата выдачи</div>
      </div>
    </div>
  </div>`;
}

async function renderTaskToPdf(pdf: any, html: string, isFirstPage: boolean) {
  const { default: html2canvas } = await import("html2canvas");

  const container = document.createElement("div");
  container.style.cssText = [
    "position:fixed",
    "top:-9999px",
    "left:-9999px",
    "width:794px",
    "background:white",
    "font-family:Arial,Helvetica,sans-serif",
    "color:#000",
    "font-size:11px",
    "line-height:1.4",
  ].join(";");
  container.innerHTML = html;
  document.body.appendChild(container);

  try {
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
      logging: false,
    });

    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const imgW = pageW;
    const imgH = (canvas.height * pageW) / canvas.width;

    if (imgH <= pageH) {
      if (!isFirstPage) pdf.addPage();
      pdf.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0, imgW, imgH);
    } else {
      const pxPerPage = (canvas.width * pageH) / pageW;
      let offsetPx = 0;
      let firstSlice = true;
      while (offsetPx < canvas.height) {
        const sliceH = Math.min(pxPerPage, canvas.height - offsetPx);
        const sliceCanvas = document.createElement("canvas");
        sliceCanvas.width = canvas.width;
        sliceCanvas.height = sliceH;
        sliceCanvas.getContext("2d")!.drawImage(canvas, 0, -offsetPx);
        const sliceMm = (sliceH * pageW) / canvas.width;
        if (!isFirstPage || !firstSlice) pdf.addPage();
        pdf.addImage(sliceCanvas.toDataURL("image/png"), "PNG", 0, 0, imgW, sliceMm);
        offsetPx += pxPerPage;
        firstSlice = false;
      }
    }
  } finally {
    document.body.removeChild(container);
  }
}

export async function generateProductionPDF(task: any, company: any) {
  const { default: jsPDF } = await import("jspdf");
  const pdf = new jsPDF("p", "mm", "a4");
  const statusLabels = await fetchColumnLabels();
  await renderTaskToPdf(pdf, buildTaskHtml(task, company, statusLabels), true);
  pdf.save(`Задание-${task.title?.slice(0, 40) ?? task.id}.pdf`);
}

export async function generateProductionBulkPDF(tasks: any[], company: any) {
  if (tasks.length === 0) return;
  const { default: jsPDF } = await import("jspdf");
  const pdf = new jsPDF("p", "mm", "a4");
  const statusLabels = await fetchColumnLabels();
  for (let i = 0; i < tasks.length; i++) {
    await renderTaskToPdf(pdf, buildTaskHtml(tasks[i], company, statusLabels), i === 0);
  }
  const dateStr = new Date().toISOString().slice(0, 10);
  pdf.save(`Задания-${tasks.length}шт-${dateStr}.pdf`);
}
