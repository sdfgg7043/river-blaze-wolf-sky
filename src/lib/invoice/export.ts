import { fileStamp, sumLines, toArabicDigits } from "@/lib/invoice/format";
import { tafqeetDinar } from "@/lib/invoice/tafqeet";
import type { Invoice, Shop } from "@/lib/invoice/types";

function materialize(clone: HTMLElement, orig: HTMLElement) {
  const origInputs = [...orig.querySelectorAll("input")];
  const cloneInputs = [...clone.querySelectorAll("input")];
  cloneInputs.forEach((input, index) => {
    const source = origInputs[index];
    const div = document.createElement("div");
    div.className = `${input.className} as-text`;
    div.textContent = source?.value ?? "";
    input.replaceWith(div);
  });

  const origCanvas = [...orig.querySelectorAll("canvas")];
  const cloneCanvas = [...clone.querySelectorAll("canvas")];
  cloneCanvas.forEach((canvas, index) => {
    const source = origCanvas[index];
    if (!source) return;
    const ctx = canvas.getContext("2d");
    canvas.width = source.width;
    canvas.height = source.height;
    if (ctx) ctx.drawImage(source, 0, 0);
  });
}

export async function captureSheet(): Promise<HTMLCanvasElement> {
  const orig = document.getElementById("invoice-sheet");
  if (!orig) throw new Error("missing sheet");
  if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
  await new Promise((resolve) => setTimeout(resolve, 160));
  await document.fonts.ready;

  const live = document.getElementById("invoice-sheet");
  if (!live) throw new Error("missing sheet");
  const clone = live.cloneNode(true) as HTMLElement;
  clone.id = "invoice-capture";
  materialize(clone, live);
  clone.style.position = "fixed";
  clone.style.left = "-12000px";
  clone.style.top = "0";
  clone.style.margin = "0";
  clone.style.transform = "none";
  clone.style.boxShadow = "none";
  document.body.appendChild(clone);

  try {
    const { default: html2canvas } = await import("html2canvas");
    return await html2canvas(clone, {
      scale: 2,
      backgroundColor: "#fffef8",
      useCORS: true,
      logging: false,
    });
  } finally {
    clone.remove();
  }
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function stemOf(shop: Shop, draft: Invoice): string {
  const who = (draft.customer || shop.name || "وصل").replace(/[\\/:*?"<>|]+/g, "").trim() || "وصل";
  return `وصل-${shop.name || "المؤمل"}-${who}-${fileStamp(draft.dateDay, draft.dateMonth, draft.dateYear)}`;
}

export async function downloadPng(shop: Shop, draft: Invoice) {
  const canvas = await captureSheet();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) throw new Error("png");
  downloadBlob(blob, `${stemOf(shop, draft)}.png`);
}

export async function downloadPdf(shop: Shop, draft: Invoice) {
  const canvas = await captureSheet();
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  pdf.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0, pageW, pageH, undefined, "FAST");
  pdf.save(`${stemOf(shop, draft)}.pdf`);
}

export async function shareOrSaveImage(shop: Shop, draft: Invoice): Promise<"shared" | "saved"> {
  const canvas = await captureSheet();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) throw new Error("png");
  const filename = `${stemOf(shop, draft)}.png`;
  const file = new File([blob], filename, { type: "image/png" });
  if (navigator.canShare?.({ files: [file] })) {
    await navigator.share({
      files: [file],
      title: `وصل ${shop.name}`,
      text: summaryText(shop, draft),
    });
    return "shared";
  }
  downloadBlob(blob, filename);
  return "saved";
}

export function summaryText(shop: Shop, draft: Invoice): string {
  const digits = (value: string) => (shop.arabicDigits ? toArabicDigits(value) : value);
  const rows = draft.lines
    .map((line) => {
      const qty = line.qty.trim();
      const price = line.price.trim();
      const amount = line.auto ? "" : line.amount.trim();
      if (!line.details.trim() && !qty && !price && !amount) return "";
      const bits = [line.details.trim() || "—"];
      if (qty) bits.push(`العدد ${digits(qty)}`);
      if (price) bits.push(`السعر ${digits(price)}`);
      return `- ${bits.join(" · ")}`;
    })
    .filter(Boolean);
  const total = sumLines(draft.lines);
  const totalLabel = shop.arabicDigits ? toArabicDigits(String(total)) : String(total);
  const date = [draft.dateDay, draft.dateMonth, draft.dateYear].filter(Boolean).join("/");
  return [
    `وصل — ${shop.name}`,
    shop.activity,
    draft.customer ? `حضرة السيد: ${draft.customer} ${shop.honorific}` : "",
    date ? `التاريخ: ${digits(date)}` : "",
    rows.join("\n"),
    total ? `المجموع: ${totalLabel}` : "",
    shop.showTafqeet ? tafqeetDinar(total) : "",
    shop.address,
    digits(shop.phone),
  ]
    .filter(Boolean)
    .join("\n");
}

export function downloadBackup(shop: Shop, draft: Invoice, archive: Invoice[]) {
  const blob = new Blob([JSON.stringify({ shop, draft, archive }, null, 2)], { type: "application/json" });
  downloadBlob(blob, `دفتر-${shop.name || "المؤمل"}.json`);
}
