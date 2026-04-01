import { formatDate } from "./utils";

async function loadImageBase64(key: string): Promise<string | null> {
  if (!key) return null;
  try {
    const url = key.startsWith("http") ? key : `/api/files?key=${encodeURIComponent(key)}&view=1`;
    const res = await fetch(url);
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export async function generateOfferPDF(offer: any, company?: any) {
  const subtotal = offer.items.reduce((s: number, i: any) => s + i.total, 0);
  const afterDiscount = offer.discount > 0 ? subtotal * (1 - offer.discount / 100) : subtotal;
  const vatAmount = offer.vatRate > 0 ? afterDiscount * (offer.vatRate / 100) : 0;
  const discountAmount = subtotal - afterDiscount;

  const [stampB64, signatureB64] = await Promise.all([
    company?.stampImage ? loadImageBase64(company.stampImage) : Promise.resolve(null),
    company?.signatureImage ? loadImageBase64(company.signatureImage) : Promise.resolve(null),
  ]);

  const container = document.createElement("div");
  container.style.cssText = [
    "position:fixed",
    "top:-9999px",
    "left:-9999px",
    "width:794px",
    "background:white",
    "font-family:Arial,Helvetica,sans-serif",
    "padding:48px",
    "color:#1a2332",
    "font-size:13px",
    "line-height:1.5",
  ].join(";");

  container.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #334155;padding-bottom:20px;margin-bottom:24px;">
      <div>
        <h1 style="font-size:22px;font-weight:700;margin:0 0 6px 0;color:#0f172a;">
          Коммерческое предложение №${offer.numberOverride ?? offer.number}
        </h1>
        ${(offer.client || offer.request?.client) ? `<p style="margin:3px 0;color:#475569;">Клиент: <strong>${(offer.client || offer.request?.client).name}</strong></p>` : ""}
        ${(offer.client || offer.request?.client)?.phone ? `<p style="margin:3px 0;color:#64748b;">Телефон: ${(offer.client || offer.request?.client).phone}</p>` : ""}
        ${(offer.client || offer.request?.client)?.email ? `<p style="margin:3px 0;color:#64748b;">Email: ${(offer.client || offer.request?.client).email}</p>` : ""}
      </div>
      <div style="text-align:right;color:#64748b;">
        <p style="margin:3px 0;">Дата: <strong>${formatDate(offer.createdAt)}</strong></p>
        ${offer.validUntil ? `<p style="margin:3px 0;">Действует до: <strong>${formatDate(offer.validUntil)}</strong></p>` : ""}
        ${offer.createdBy?.name ? `<p style="margin:3px 0;">Менеджер: ${offer.createdBy.name}</p>` : ""}
      </div>
    </div>

    <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
      <thead>
        <tr style="background:#334155;color:white;">
          <th style="padding:9px 8px;text-align:left;width:28px;font-weight:600;">№</th>
          <th style="padding:9px 8px;text-align:left;font-weight:600;">Услуга</th>
          <th style="padding:9px 8px;text-align:left;font-weight:600;">Описание</th>
          <th style="padding:9px 8px;text-align:right;width:60px;font-weight:600;">Кол-во</th>
          <th style="padding:9px 8px;text-align:center;width:40px;font-weight:600;">Ед.</th>
          <th style="padding:9px 8px;text-align:right;width:85px;font-weight:600;">Цена</th>
          <th style="padding:9px 8px;text-align:right;width:95px;font-weight:600;">Сумма</th>
        </tr>
      </thead>
      <tbody>
        ${offer.items.map((item: any, idx: number) => `
          <tr style="border-bottom:1px solid #e2e8f0;background:${idx % 2 === 0 ? "white" : "#f8fafc"};">
            <td style="padding:8px;color:#94a3b8;">${idx + 1}</td>
            <td style="padding:8px;font-weight:500;">${item.service}</td>
            <td style="padding:8px;color:#64748b;">${item.description ?? "—"}</td>
            <td style="padding:8px;text-align:right;">${item.quantity}</td>
            <td style="padding:8px;text-align:center;color:#64748b;">${item.unit}</td>
            <td style="padding:8px;text-align:right;">${item.price.toLocaleString("ru")} ₽</td>
            <td style="padding:8px;text-align:right;font-weight:600;">${item.total.toLocaleString("ru")} ₽</td>
          </tr>
        `).join("")}
      </tbody>
    </table>

    <div style="display:flex;justify-content:flex-end;">
      <div style="width:230px;">
        <div style="display:flex;justify-content:space-between;margin-bottom:6px;color:#64748b;">
          <span>Подытог</span>
          <span>${subtotal.toLocaleString("ru")} ₽</span>
        </div>
        ${offer.discount > 0 ? `
        <div style="display:flex;justify-content:space-between;margin-bottom:6px;color:#16a34a;">
          <span>Скидка ${offer.discount}%</span>
          <span>−${discountAmount.toLocaleString("ru")} ₽</span>
        </div>` : ""}
        ${offer.vatRate > 0 ? `
        <div style="display:flex;justify-content:space-between;margin-bottom:6px;color:#64748b;">
          <span>НДС ${offer.vatRate}%</span>
          <span>${vatAmount.toLocaleString("ru")} ₽</span>
        </div>` : ""}
        <div style="display:flex;justify-content:space-between;border-top:2px solid #334155;padding-top:8px;margin-top:4px;font-size:16px;font-weight:700;">
          <span>Итого</span>
          <span>${offer.total.toLocaleString("ru")} ₽</span>
        </div>
      </div>
    </div>

    ${offer.notes ? `
    <div style="margin-top:28px;padding:14px;background:#f8fafc;border-left:3px solid #334155;border-radius:4px;">
      <p style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:#94a3b8;margin:0 0 6px 0;">Примечания</p>
      <p style="margin:0;color:#475569;">${offer.notes}</p>
    </div>` : ""}

    ${(stampB64 || signatureB64 || company?.director) ? `
    <div style="margin-top:36px;border-top:1px dashed #cbd5e1;padding-top:20px;position:relative;display:flex;align-items:flex-end;gap:40px;padding-bottom:8px;">
      <div style="flex:1;">
        <div style="display:flex;align-items:flex-end;gap:12px;">
          <span style="font-size:11px;font-weight:600;white-space:nowrap;color:#334155;">Руководитель</span>
          <div style="flex:1;">
            <div style="border-bottom:1px solid #334155;height:56px;display:flex;align-items:flex-end;justify-content:center;padding-bottom:2px;">
              ${signatureB64 ? `<img src="${signatureB64}" style="height:50px;opacity:0.85;object-fit:contain;" />` : ""}
            </div>
            <div style="font-size:10px;text-align:center;margin-top:3px;color:#64748b;">${company?.director ?? ""}</div>
          </div>
        </div>
      </div>
      <div style="flex:1;"></div>
      ${stampB64 ? `
      <div style="position:absolute;left:120px;bottom:8px;transform:translateX(-50%);">
        <img src="${stampB64}" style="height:90px;width:90px;object-fit:contain;opacity:0.8;" />
      </div>` : ""}
    </div>` : ""}
  `;

  document.body.appendChild(container);

  try {
    const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
      import("html2canvas"),
      import("jspdf"),
    ]);

    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
      logging: false,
    });

    const pdf = new jsPDF("p", "mm", "a4");
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const imgW = pageW;
    const imgH = (canvas.height * pageW) / canvas.width;

    if (imgH <= pageH) {
      pdf.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0, imgW, imgH);
    } else {
      // Split across pages
      const pxPerPage = (canvas.width * pageH) / pageW;
      let offsetPx = 0;
      while (offsetPx < canvas.height) {
        const sliceH = Math.min(pxPerPage, canvas.height - offsetPx);
        const sliceCanvas = document.createElement("canvas");
        sliceCanvas.width = canvas.width;
        sliceCanvas.height = sliceH;
        sliceCanvas.getContext("2d")!.drawImage(canvas, 0, -offsetPx);
        const sliceMm = (sliceH * pageW) / canvas.width;
        if (offsetPx > 0) pdf.addPage();
        pdf.addImage(sliceCanvas.toDataURL("image/png"), "PNG", 0, 0, imgW, sliceMm);
        offsetPx += pxPerPage;
      }
    }

    pdf.save(`KP-${offer.numberOverride ?? offer.number}.pdf`);
  } finally {
    document.body.removeChild(container);
  }
}
