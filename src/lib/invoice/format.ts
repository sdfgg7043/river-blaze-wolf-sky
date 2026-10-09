import type { Line } from "@/lib/invoice/types";

const EAST = "٠١٢٣٤٥٦٧٨٩";

export function toArabicDigits(value: string): string {
  return value.replace(/\d/g, (d) => EAST[Number(d)] ?? d);
}

export function normalizeDigits(value: string): string {
  return value.replace(/[٠-٩]/g, (d) => String(EAST.indexOf(d)));
}

export function parseNum(value: string): number {
  const clean = normalizeDigits(value)
    .replace(/[٬,\s]/g, "")
    .replace("٫", ".")
    .replace(/[^\d.-]/g, "");
  if (!clean || clean === "." || clean === "-" || clean === "-.") return 0;
  const n = Number(clean);
  return Number.isFinite(n) ? n : 0;
}

export function formatAmount(n: number, arabic: boolean): string {
  if (!n) return "";
  const formatted = new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 3,
  }).format(n);
  if (!arabic) return formatted;
  return toArabicDigits(formatted).replace(/,/g, "٬");
}

export function lineTotal(line: Pick<Line, "qty" | "price">): number {
  const q = parseNum(line.qty);
  const p = parseNum(line.price);
  if (!q || !p) return 0;
  return Math.round(q * p * 1000) / 1000;
}

export function lineAmount(line: Line): number {
  if (!line.auto && line.amount.trim()) return parseNum(line.amount);
  return lineTotal(line);
}

export function sumLines(lines: Line[]): number {
  return lines.reduce((sum, line) => sum + lineAmount(line), 0);
}

export function todayParts(): { dateDay: string; dateMonth: string; dateYear: string } {
  const d = new Date();
  return {
    dateDay: String(d.getDate()).padStart(2, "0"),
    dateMonth: String(d.getMonth() + 1).padStart(2, "0"),
    dateYear: String(d.getFullYear()),
  };
}

export function fileStamp(day: string, month: string, year: string): string {
  if (!day && !month && !year) return "بدون-تاريخ";
  return [year, month, day].filter(Boolean).join("-");
}
