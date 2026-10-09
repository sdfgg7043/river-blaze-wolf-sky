import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { todayParts } from "@/lib/invoice/format";
import type { BackupFile, Invoice, Line, Shop } from "@/lib/invoice/types";

export const defaultShop: Shop = {
  name: "المؤمل",
  activity: "للمواد الانشائية والكهربائية والعدد اليدوية",
  address: "كربلاء المقدسة - حي المعلمين",
  phone: "07726570980",
  honorific: "المحترم",
  legal: "الخطأ والسهو مرجوع للطرفين",
  showTafqeet: true,
  arabicDigits: true,
};

const MAX_LINES = 22;
const MIN_LINES = 8;
const ARCHIVE_LIMIT = 40;

function emptyLine(): Line {
  return {
    id: crypto.randomUUID(),
    details: "",
    qty: "",
    price: "",
    amount: "",
    auto: true,
  };
}

export function blankInvoice(): Invoice {
  return {
    id: crypto.randomUUID(),
    customer: "",
    dateDay: "",
    dateMonth: "",
    dateYear: "",
    lines: Array.from({ length: 16 }, emptyLine),
    signature: "",
    savedAt: null,
  };
}

export function invoiceHasContent(invoice: Invoice): boolean {
  return Boolean(
    invoice.customer.trim() ||
      invoice.signature ||
      invoice.lines.some((line) => line.details.trim() || line.qty.trim() || line.price.trim() || line.amount.trim()),
  );
}

function memoryStorage() {
  const mem = new Map<string, string>();
  return {
    getItem: (key: string) => mem.get(key) ?? null,
    setItem: (key: string, value: string) => {
      mem.set(key, value);
    },
    removeItem: (key: string) => {
      mem.delete(key);
    },
  };
}

type LedgerState = {
  shop: Shop;
  draft: Invoice;
  archive: Invoice[];
  patchShop: (partial: Partial<Shop>) => void;
  patchDraft: (partial: Partial<Invoice>) => void;
  patchLine: (id: string, partial: Partial<Line>) => void;
  addLine: () => void;
  removeLine: () => void;
  clearSignature: () => void;
  saveCopy: () => void;
  newInvoice: () => boolean;
  loadInvoice: (id: string) => void;
  deleteInvoice: (id: string) => void;
  fillSample: () => void;
  replaceBackup: (backup: BackupFile) => void;
};

function normalizeLine(value: Partial<Line> | undefined): Line {
  return {
    id: typeof value?.id === "string" ? value.id : crypto.randomUUID(),
    details: String(value?.details ?? ""),
    qty: String(value?.qty ?? ""),
    price: String(value?.price ?? ""),
    amount: String(value?.amount ?? ""),
    auto: value?.auto !== false,
  };
}

function normalizeInvoice(value: Partial<Invoice> | undefined, fallback: Invoice): Invoice {
  if (!value || typeof value !== "object") return fallback;
  const lines = Array.isArray(value.lines) ? value.lines.map((line) => normalizeLine(line)) : fallback.lines;
  return {
    id: typeof value.id === "string" ? value.id : fallback.id,
    customer: String(value.customer ?? ""),
    dateDay: String(value.dateDay ?? ""),
    dateMonth: String(value.dateMonth ?? ""),
    dateYear: String(value.dateYear ?? ""),
    lines: lines.length ? lines : fallback.lines,
    signature: typeof value.signature === "string" ? value.signature : "",
    savedAt: typeof value.savedAt === "number" ? value.savedAt : null,
  };
}

export function parseBackup(input: unknown): BackupFile | null {
  if (!input || typeof input !== "object") return null;
  const record = input as Partial<BackupFile>;
  if (!record.draft || typeof record.draft !== "object") return null;
  const shop = { ...defaultShop, ...(record.shop ?? {}) };
  const draft = normalizeInvoice(record.draft, blankInvoice());
  const archive = Array.isArray(record.archive)
    ? record.archive.map((item) => normalizeInvoice(item, blankInvoice()))
    : [];
  return { shop, draft, archive };
}

export const useLedger = create<LedgerState>()(
  persist(
    (set, get) => ({
      shop: defaultShop,
      draft: blankInvoice(),
      archive: [],
      patchShop: (partial) => set((state) => ({ shop: { ...state.shop, ...partial } })),
      patchDraft: (partial) => set((state) => ({ draft: { ...state.draft, ...partial } })),
      patchLine: (id, partial) =>
        set((state) => ({
          draft: {
            ...state.draft,
            lines: state.draft.lines.map((line) => (line.id === id ? { ...line, ...partial } : line)),
          },
        })),
      addLine: () =>
        set((state) => {
          if (state.draft.lines.length >= MAX_LINES) return state;
          return { draft: { ...state.draft, lines: [...state.draft.lines, emptyLine()] } };
        }),
      removeLine: () =>
        set((state) => {
          if (state.draft.lines.length <= MIN_LINES) return state;
          return { draft: { ...state.draft, lines: state.draft.lines.slice(0, -1) } };
        }),
      clearSignature: () => set((state) => ({ draft: { ...state.draft, signature: "" } })),
      saveCopy: () => {
        const draft = structuredClone(get().draft);
        draft.savedAt = Date.now();
        const archive = [draft, ...get().archive.filter((item) => item.id !== draft.id)].slice(0, ARCHIVE_LIMIT);
        set({ draft, archive });
      },
      newInvoice: () => {
        const current = get().draft;
        let archive = get().archive;
        const kept = invoiceHasContent(current);
        if (kept) {
          const copy = structuredClone(current);
          copy.savedAt = Date.now();
          archive = [copy, ...archive.filter((item) => item.id !== copy.id)].slice(0, ARCHIVE_LIMIT);
        }
        set({
          archive,
          draft: { ...blankInvoice(), ...todayParts() },
        });
        return kept;
      },
      loadInvoice: (id) => {
        const found = get().archive.find((item) => item.id === id);
        if (!found) return;
        set({ draft: structuredClone(found) });
      },
      deleteInvoice: (id) => set((state) => ({ archive: state.archive.filter((item) => item.id !== id) })),
      fillSample: () =>
        set((state) => {
          const samples: Array<Pick<Line, "details" | "qty" | "price">> = [
            { details: "سلك نحاسي مفرد 2.5 ملم", qty: "2", price: "15000" },
            { details: "قاطع دورة 32 أمبير", qty: "4", price: "4500" },
            { details: "مقبس جداري أبيض", qty: "6", price: "2000" },
            { details: "مفتاح إنارة مفرد", qty: "8", price: "1500" },
            { details: "شريط كهرباء 4 منافذ", qty: "1", price: "8500" },
            { details: "لمبة 60 واط", qty: "10", price: "750" },
          ];
          const lines = state.draft.lines.map((line, index) => {
            const sample = samples[index];
            if (!sample) return { ...line, details: "", qty: "", price: "", amount: "", auto: true };
            return { ...line, ...sample, amount: "", auto: true };
          });
          return {
            draft: {
              ...state.draft,
              customer: "علي حسين الجبوري",
              ...todayParts(),
              lines,
            },
          };
        }),
      replaceBackup: (backup) =>
        set({
          shop: { ...defaultShop, ...backup.shop },
          draft: normalizeInvoice(backup.draft, blankInvoice()),
          archive: backup.archive.map((item) => normalizeInvoice(item, blankInvoice())),
        }),
    }),
    {
      name: "muamal-ledger-v1",
      skipHydration: true,
      storage: createJSONStorage(() => (typeof window === "undefined" ? memoryStorage() : localStorage)),
      partialize: (state) => ({ shop: state.shop, draft: state.draft, archive: state.archive }),
      merge: (persisted, current) => {
        const saved = (persisted ?? {}) as Partial<Pick<LedgerState, "shop" | "draft" | "archive">>;
        return {
          ...current,
          shop: { ...current.shop, ...(saved.shop ?? {}) },
          draft: normalizeInvoice(saved.draft, current.draft),
          archive: Array.isArray(saved.archive) ? saved.archive.map((item) => normalizeInvoice(item, blankInvoice())) : [],
        };
      },
    },
  ),
);
