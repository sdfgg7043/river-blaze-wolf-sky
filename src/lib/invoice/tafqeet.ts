const ONES = ["", "واحد", "اثنان", "ثلاثة", "أربعة", "خمسة", "ستة", "سبعة", "ثمانية", "تسعة"];
const TEENS = [
  "عشرة",
  "أحد عشر",
  "اثنا عشر",
  "ثلاثة عشر",
  "أربعة عشر",
  "خمسة عشر",
  "ستة عشر",
  "سبعة عشر",
  "ثمانية عشر",
  "تسعة عشر",
];
const TENS = ["", "", "عشرون", "ثلاثون", "أربعون", "خمسون", "ستون", "سبعون", "ثمانون", "تسعون"];
const HUNDREDS = ["", "مئة", "مئتان", "ثلاثمئة", "أربعمئة", "خمسمئة", "ستمئة", "سبعمئة", "ثمانمئة", "تسعمئة"];

function under100(n: number): string {
  if (n < 10) return ONES[n] ?? "";
  if (n < 20) return TEENS[n - 10] ?? "";
  const tens = Math.floor(n / 10);
  const ones = n % 10;
  if (!ones) return TENS[tens] ?? "";
  return `${ONES[ones]} و${TENS[tens]}`;
}

function under1000(n: number): string {
  const hundreds = Math.floor(n / 100);
  const rest = n % 100;
  if (!hundreds) return under100(rest);
  if (!rest) return HUNDREDS[hundreds] ?? "";
  return `${HUNDREDS[hundreds]} و${under100(rest)}`;
}

function scale(n: number, one: string, two: string, few: string, many: string): string {
  if (n === 1) return one;
  if (n === 2) return two;
  if (n >= 3 && n <= 10) return `${under1000(n)} ${few}`;
  return `${under1000(n)} ${many}`;
}

export function integerToArabicWords(n: number): string {
  const value = Math.floor(Math.abs(n));
  if (value === 0) return "صفر";
  const millions = Math.floor(value / 1_000_000);
  const thousands = Math.floor((value % 1_000_000) / 1000);
  const rest = value % 1000;
  const parts: string[] = [];
  if (millions) parts.push(scale(millions, "مليون", "مليونان", "ملايين", "مليون"));
  if (thousands) parts.push(scale(thousands, "ألف", "ألفان", "آلاف", "ألف"));
  if (rest) parts.push(under1000(rest));
  return parts.join(" و");
}

export function tafqeetDinar(n: number): string {
  const whole = Math.round(n);
  if (whole <= 0) return "";
  if (whole === 1) return "فقط دينار عراقي واحد لا غير";
  if (whole === 2) return "فقط ديناران عراقيان لا غير";
  const words = integerToArabicWords(whole);
  const unit = whole >= 3 && whole <= 10 ? "دنانير عراقية" : "دينار عراقي";
  return `فقط ${words} ${unit} لا غير`;
}
