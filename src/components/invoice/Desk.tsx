import { useEffect, useRef, useState } from "react";
import {
  Copy,
  Download,
  FilePlus,
  Image as ImageIcon,
  Minus,
  Plus,
  Printer,
  Save,
  Share2,
  Trash2,
  Upload,
} from "lucide-react";
import { InvoiceSheet } from "@/components/invoice/InvoiceSheet";
import { SignaturePad } from "@/components/invoice/SignaturePad";
import { formatAmount, sumLines, toArabicDigits } from "@/lib/invoice/format";
import { downloadBackup, downloadPdf, downloadPng, shareOrSaveImage, summaryText } from "@/lib/invoice/export";
import { invoiceHasContent, parseBackup, useLedger } from "@/lib/invoice/store";

const SHEET_PX = (210 * 96) / 25.4;

function useCompact() {
  const [compact, setCompact] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia("(max-width: 1023px)").matches : false,
  );
  useEffect(() => {
    const query = window.matchMedia("(max-width: 1023px)");
    const apply = () => setCompact(query.matches);
    apply();
    query.addEventListener("change", apply);
    return () => query.removeEventListener("change", apply);
  }, []);
  return compact;
}

function PaperStage() {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const compact = useCompact();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => {
      const next = Math.min(1, (el.clientWidth - 1) / SHEET_PX);
      setScale(Number.isFinite(next) && next > 0 ? next : 1);
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="stage">
      <div ref={ref} className="stage-inner">
        <div className="fit-box" style={{ width: `calc(210mm * ${scale})`, height: `calc(297mm * ${scale})` }}>
          <div className="fit-scale" style={{ transform: `scale(${scale})` }}>
            <InvoiceSheet compact={compact} />
          </div>
        </div>
      </div>
    </div>
  );
}

export function Desk() {
  const shop = useLedger((state) => state.shop);
  const draft = useLedger((state) => state.draft);
  const archive = useLedger((state) => state.archive);
  const patchShop = useLedger((state) => state.patchShop);
  const patchDraft = useLedger((state) => state.patchDraft);
  const patchLine = useLedger((state) => state.patchLine);
  const addLine = useLedger((state) => state.addLine);
  const removeLine = useLedger((state) => state.removeLine);
  const clearSignature = useLedger((state) => state.clearSignature);
  const saveCopy = useLedger((state) => state.saveCopy);
  const newInvoice = useLedger((state) => state.newInvoice);
  const loadInvoice = useLedger((state) => state.loadInvoice);
  const deleteInvoice = useLedger((state) => state.deleteInvoice);
  const fillSample = useLedger((state) => state.fillSample);
  const replaceBackup = useLedger((state) => state.replaceBackup);
  const compact = useCompact();
  const fileRef = useRef<HTMLInputElement>(null);
  const [flash, setFlash] = useState("");
  const [busy, setBusy] = useState(false);
  const total = sumLines(draft.lines);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== "s") return;
      event.preventDefault();
      saveCopy();
      ping("حُفظت نسخة في الدفتر");
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [saveCopy]);

  function ping(message: string) {
    setFlash(message);
    window.setTimeout(() => setFlash(""), 2600);
  }

  async function run(task: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    try {
      await task();
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return;
      ping("تعذر التصدير. استخدم الطباعة ثم «حفظ كـ PDF».");
    } finally {
      setBusy(false);
    }
  }

  const totalLabel = formatAmount(total, shop.arabicDigits);

  return (
    <div className="app">
      <header className="toolbar no-print">
        <div className="lockup">
          <p className="lockup-name">{shop.name || "المؤمل"}</p>
          <p className="lockup-sub">دفتر الوصولات · اكتب ثم اطبع</p>
        </div>
        <p className="total-chip">
          المجموع
          <strong>{totalLabel || (shop.arabicDigits ? "٠" : "0")}</strong>
        </p>
        <button type="button" className="btn btn-primary" onClick={() => window.print()}>
          <Printer className="size-4" aria-hidden="true" />
          طباعة
        </button>
        <button
          type="button"
          className="btn btn-primary"
          disabled={busy}
          onClick={() =>
            void run(async () => {
              await downloadPdf(shop, draft);
              ping("تم تنزيل ملف PDF");
            })
          }
        >
          <Download className="size-4" aria-hidden="true" />
          PDF
        </button>
        <button
          type="button"
          className="btn"
          disabled={busy}
          onClick={() =>
            void run(async () => {
              await downloadPng(shop, draft);
              ping("تم تنزيل الصورة");
            })
          }
        >
          <ImageIcon className="size-4" aria-hidden="true" />
          صورة
        </button>
        <button
          type="button"
          className="btn"
          disabled={busy}
          onClick={() =>
            void run(async () => {
              const result = await shareOrSaveImage(shop, draft);
              ping(result === "shared" ? "تمت المشاركة" : "تم تنزيل الصورة");
            })
          }
        >
          <Share2 className="size-4" aria-hidden="true" />
          مشاركة
        </button>
        <button
          type="button"
          className="btn"
          onClick={() => {
            void navigator.clipboard.writeText(summaryText(shop, draft)).then(
              () => ping("نُسخ ملخص الوصل"),
              () => ping("تعذر النسخ"),
            );
          }}
        >
          <Copy className="size-4" aria-hidden="true" />
          نسخ
        </button>
        <button
          type="button"
          className="btn"
          onClick={() => {
            saveCopy();
            ping("حُفظت نسخة في الدفتر");
          }}
        >
          <Save className="size-4" aria-hidden="true" />
          حفظ
        </button>
        <button
          type="button"
          className="btn"
          onClick={() => {
            const kept = newInvoice();
            ping(kept ? "وُضع الوصل السابق في الدفتر" : "وصل جديد");
          }}
        >
          <FilePlus className="size-4" aria-hidden="true" />
          جديد
        </button>
        <p className="flash" role="status">
          {flash}
        </p>
      </header>

      <div className="workspace">
        <aside className="panel no-print">
          <section className="block">
            <h2>الزبون</h2>
            <label className="field">
              <span>حضرة السيد</span>
              <input
                value={draft.customer}
                onChange={(event) => patchDraft({ customer: event.target.value })}
                placeholder="اسم الزبون"
              />
            </label>
            <div className="date-edit">
              <label className="field">
                <span>اليوم</span>
                <input
                  inputMode="numeric"
                  value={draft.dateDay}
                  onChange={(event) => patchDraft({ dateDay: event.target.value.replace(/\D/g, "").slice(0, 2) })}
                />
              </label>
              <label className="field">
                <span>الشهر</span>
                <input
                  inputMode="numeric"
                  value={draft.dateMonth}
                  onChange={(event) => patchDraft({ dateMonth: event.target.value.replace(/\D/g, "").slice(0, 2) })}
                />
              </label>
              <label className="field">
                <span>السنة</span>
                <input
                  inputMode="numeric"
                  value={draft.dateYear}
                  onChange={(event) => patchDraft({ dateYear: event.target.value.replace(/\D/g, "").slice(0, 4) })}
                />
              </label>
            </div>
            <div className="checks">
              <label className="check">
                <input
                  type="checkbox"
                  checked={shop.arabicDigits}
                  onChange={(event) => patchShop({ arabicDigits: event.target.checked })}
                />
                أرقام عربية
              </label>
              <label className="check">
                <input
                  type="checkbox"
                  checked={shop.showTafqeet}
                  onChange={(event) => patchShop({ showTafqeet: event.target.checked })}
                />
                المبلغ كتابةً
              </label>
            </div>
            <div className="row-actions">
              <button type="button" className="btn" onClick={addLine}>
                <Plus className="size-4" aria-hidden="true" />
                سطر
              </button>
              <button type="button" className="btn" onClick={removeLine}>
                <Minus className="size-4" aria-hidden="true" />
                حذف السطر
              </button>
              <button type="button" className="btn" onClick={fillSample}>
                مثال
              </button>
            </div>
          </section>

          <details className="fold" key={compact ? "lines-m" : "lines-d"} open={compact || undefined}>
            <summary>أسطر الوصل</summary>
            <div className="lines">
              {draft.lines.map((line, index) => {
                const amount = formatAmount(sumLines([line]), shop.arabicDigits);
                return (
                  <div className="line-edit" key={line.id}>
                    <span className="line-no">{shop.arabicDigits ? toArabicDigits(String(index + 1)) : index + 1}</span>
                    <input
                      aria-label={`تفاصيل ${index + 1}`}
                      placeholder="التفاصيل"
                      value={line.details}
                      onChange={(event) => patchLine(line.id, { details: event.target.value })}
                    />
                    <input
                      aria-label={`العدد ${index + 1}`}
                      inputMode="decimal"
                      placeholder="العدد"
                      value={line.qty}
                      onChange={(event) => patchLine(line.id, { qty: event.target.value, auto: true, amount: "" })}
                    />
                    <input
                      aria-label={`السعر ${index + 1}`}
                      inputMode="decimal"
                      placeholder="السعر"
                      value={line.price}
                      onChange={(event) => patchLine(line.id, { price: event.target.value, auto: true, amount: "" })}
                    />
                    <output>{amount}</output>
                  </div>
                );
              })}
            </div>
          </details>

          <details className="fold" key={compact ? "sign-m" : "sign-d"} open={compact || undefined}>
            <summary>التوقيع</summary>
            {compact ? (
              <SignaturePad
                uid={draft.id}
                value={draft.signature}
                onChange={(signature) => patchDraft({ signature })}
                className="panel-sign"
              />
            ) : (
              <p className="hint">وقّع بالفأرة أو الإصبع داخل مربع التوقيع على الوصل.</p>
            )}
            <button type="button" className="btn" onClick={clearSignature} disabled={!draft.signature}>
              مسح التوقيع
            </button>
          </details>

          <details className="fold">
            <summary>بيانات المحل</summary>
            <label className="field">
              <span>اسم المحل</span>
              <input value={shop.name} onChange={(event) => patchShop({ name: event.target.value })} />
            </label>
            <label className="field">
              <span>النشاط</span>
              <textarea rows={2} value={shop.activity} onChange={(event) => patchShop({ activity: event.target.value })} />
            </label>
            <label className="field">
              <span>العنوان</span>
              <input value={shop.address} onChange={(event) => patchShop({ address: event.target.value })} />
            </label>
            <label className="field">
              <span>الهاتف</span>
              <input value={shop.phone} inputMode="tel" onChange={(event) => patchShop({ phone: event.target.value })} />
            </label>
            <label className="field">
              <span>عبارة التبجيل</span>
              <input value={shop.honorific} onChange={(event) => patchShop({ honorific: event.target.value })} />
            </label>
            <label className="field">
              <span>ملاحظة التذييل</span>
              <input value={shop.legal} onChange={(event) => patchShop({ legal: event.target.value })} />
            </label>
          </details>

          <section className="block">
            <h2>الدفتر</h2>
            {archive.length === 0 ? (
              <p className="hint">لا نسخ محفوظة بعد. «حفظ» يبقي الوصل هنا حتى بعد فتح وصل جديد.</p>
            ) : (
              <ul className="archive">
                {archive.map((item) => {
                  const label = item.customer.trim() || "بدون اسم";
                  const date = [item.dateDay, item.dateMonth, item.dateYear].filter(Boolean).join("/");
                  const amount = formatAmount(sumLines(item.lines), shop.arabicDigits);
                  const active = item.id === draft.id;
                  return (
                    <li key={`${item.id}-${item.savedAt ?? 0}`} className={active ? "archive-item is-active" : "archive-item"}>
                      <button type="button" className="archive-open" onClick={() => loadInvoice(item.id)}>
                        <strong>{label}</strong>
                        <span>
                          {date || "بدون تاريخ"}
                          {amount ? ` · ${amount}` : ""}
                        </span>
                      </button>
                      <button
                        type="button"
                        className="icon-btn"
                        aria-label={`حذف وصل ${label}`}
                        onClick={() => {
                          if (window.confirm("حذف هذا الوصل من الدفتر؟")) deleteInvoice(item.id);
                        }}
                      >
                        <Trash2 className="size-4" aria-hidden="true" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
            <div className="row-actions">
              <button type="button" className="btn" onClick={() => downloadBackup(shop, draft, archive)}>
                <Download className="size-4" aria-hidden="true" />
                نسخة احتياطية
              </button>
              <button type="button" className="btn" onClick={() => fileRef.current?.click()}>
                <Upload className="size-4" aria-hidden="true" />
                استيراد
              </button>
            </div>
            <input
              ref={fileRef}
              className="sr-only"
              type="file"
              accept="application/json"
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                if (!file) return;
                void file.text().then((text) => {
                  try {
                    const backup = parseBackup(JSON.parse(text));
                    if (!backup) {
                      ping("الملف ليس دفتر وصولات");
                      return;
                    }
                    replaceBackup(backup);
                    ping("تم استيراد الدفتر");
                  } catch {
                    ping("تعذر قراءة الملف");
                  }
                });
              }}
            />
            <p className="hint">
              {invoiceHasContent(draft) ? "الوصل الحالي يُحفظ تلقائيًا في هذا المتصفح." : "الوصل فارغ مثل الورقة الأصلية."} اختصار الحفظ
              Ctrl+S.
            </p>
          </section>
        </aside>
        <PaperStage />
      </div>
    </div>
  );
}
