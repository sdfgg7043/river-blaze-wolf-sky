import { useState } from "react";
import { PaperField } from "@/components/invoice/PaperField";
import { SignaturePad } from "@/components/invoice/SignaturePad";
import { formatAmount, lineTotal, normalizeDigits, parseNum, sumLines, toArabicDigits } from "@/lib/invoice/format";
import { useLedger } from "@/lib/invoice/store";
import { tafqeetDinar } from "@/lib/invoice/tafqeet";
import type { Line } from "@/lib/invoice/types";

function ActivityLine({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [editing, setEditing] = useState(false);
  if (editing) {
    return (
      <input
        className="activity"
        autoFocus
        aria-label="نشاط المحل"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onBlur={() => setEditing(false)}
      />
    );
  }
  const parts = value.split(/(والكهربائية)/g);
  return (
    <div
      className="activity activity-view"
      role="button"
      tabIndex={0}
      onClick={() => setEditing(true)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          setEditing(true);
        }
      }}
    >
      {parts.map((part, index) =>
        part === "والكهربائية" ? (
          <span key={index} className="activity-ink">
            {part}
          </span>
        ) : (
          <span key={index}>{part}</span>
        ),
      )}
    </div>
  );
}

function AmountCell({ line }: { line: Line }) {
  const arabic = useLedger((state) => state.shop.arabicDigits);
  const patchLine = useLedger((state) => state.patchLine);
  const [focus, setFocus] = useState(false);
  const computed = lineTotal(line);
  const raw = line.auto ? (computed ? String(computed) : "") : line.amount;
  const pretty = line.auto
    ? formatAmount(computed, arabic)
    : formatAmount(parseNum(line.amount), arabic) || (arabic ? toArabicDigits(line.amount) : line.amount);

  return (
    <input
      className="cell-input"
      aria-label="المبلغ الكلي للسطر"
      inputMode="decimal"
      autoComplete="off"
      spellCheck={false}
      value={focus ? raw : pretty}
      onFocus={() => setFocus(true)}
      onBlur={(event) => {
        setFocus(false);
        if (!normalizeDigits(event.currentTarget.value).trim()) {
          patchLine(line.id, { auto: true, amount: "" });
        }
      }}
      onChange={(event) => {
        const next = normalizeDigits(event.target.value);
        patchLine(line.id, { amount: next, auto: next.trim() === "" });
      }}
    />
  );
}

export function InvoiceSheet({ compact }: { compact: boolean }) {
  const shop = useLedger((state) => state.shop);
  const draft = useLedger((state) => state.draft);
  const patchShop = useLedger((state) => state.patchShop);
  const patchDraft = useLedger((state) => state.patchDraft);
  const patchLine = useLedger((state) => state.patchLine);
  const total = sumLines(draft.lines);
  const words = shop.showTafqeet ? tafqeetDinar(total) : "";

  function padPart(kind: "day" | "month" | "year", value: string) {
    const digits = value.replace(/\D/g, "");
    if (!digits) {
      patchDraft(kind === "day" ? { dateDay: "" } : kind === "month" ? { dateMonth: "" } : { dateYear: "" });
      return;
    }
    if (kind === "year") {
      patchDraft({ dateYear: digits.length === 2 ? `20${digits}` : digits.slice(0, 4) });
      return;
    }
    const clipped = digits.slice(0, 2).padStart(2, "0");
    patchDraft(kind === "day" ? { dateDay: clipped } : { dateMonth: clipped });
  }

  return (
    <article id="invoice-sheet" className={compact ? "sheet sheet-locked" : "sheet"} dir="rtl">
      <header className="lh">
        <svg className="swoosh" viewBox="0 0 800 110" preserveAspectRatio="none" aria-hidden="true">
          <path
            fill="#ee1c24"
            d="M0,48 C90,18 180,8 300,20 C450,36 560,8 800,2 L800,70 C560,84 450,70 300,58 C160,46 80,78 0,92 Z"
          />
          <path
            fill="#fffef8"
            d="M0,62 C120,38 210,32 330,44 C480,58 590,36 800,26 L800,38 C590,50 480,70 330,56 C200,44 110,66 0,74 Z"
          />
        </svg>
        <img className="plugs" src="/plugs.png" alt="" />
        <img className="goods" src="/goods.jpg" alt="" />
        <div className="brand-wrap">
          <PaperField
            className="brand"
            label="اسم المحل"
            value={shop.name}
            arabic={shop.arabicDigits}
            onChange={(name) => patchShop({ name })}
          />
        </div>
        <ActivityLine value={shop.activity} onChange={(activity) => patchShop({ activity })} />
        <div className="contact">
          <PaperField
            className="addr"
            label="العنوان"
            value={shop.address}
            arabic={shop.arabicDigits}
            onChange={(address) => patchShop({ address })}
          />
          <PaperField
            className="phone"
            label="الهاتف"
            inputMode="numeric"
            value={shop.phone}
            arabic={shop.arabicDigits}
            onChange={(phone) => patchShop({ phone })}
          />
        </div>
      </header>

      <div className="meta">
        <span className="lbl">حضرة السيد:</span>
        <PaperField
          className="customer"
          label="اسم الزبون"
          flow
          value={draft.customer}
          arabic={shop.arabicDigits}
          onChange={(customer) => patchDraft({ customer })}
        />
        <span className="honor">{shop.honorific}</span>
        <span className="meta-gap" />
        <span className="lbl">التاريخ:</span>
        <div className="date-inputs">
          <PaperField
            className="date-part"
            label="اليوم"
            flow
            inputMode="numeric"
            maxLength={2}
            value={draft.dateDay}
            arabic={shop.arabicDigits}
            onChange={(dateDay) => patchDraft({ dateDay: dateDay.replace(/\D/g, "").slice(0, 2) })}
            onBlurValue={(value) => padPart("day", value)}
          />
          <span className="slash">/</span>
          <PaperField
            className="date-part"
            label="الشهر"
            flow
            inputMode="numeric"
            maxLength={2}
            value={draft.dateMonth}
            arabic={shop.arabicDigits}
            onChange={(dateMonth) => patchDraft({ dateMonth: dateMonth.replace(/\D/g, "").slice(0, 2) })}
            onBlurValue={(value) => padPart("month", value)}
          />
          <span className="slash">/</span>
          <PaperField
            className="date-part date-year"
            label="السنة"
            flow
            inputMode="numeric"
            maxLength={4}
            value={draft.dateYear}
            arabic={shop.arabicDigits}
            onChange={(dateYear) => patchDraft({ dateYear: dateYear.replace(/\D/g, "").slice(0, 4) })}
            onBlurValue={(value) => padPart("year", value)}
          />
        </div>
      </div>

      <div className="heads">
        <div className="head">المبلغ الكلي</div>
        <div className="head head-wide">التفاصيــــل</div>
        <div className="head">العدد</div>
        <div className="head">سعر المفرد</div>
      </div>

      <div className="grid-body">
        {draft.lines.map((line, index) => (
          <div className="row" key={line.id}>
            <div className="cell num">
              <AmountCell line={line} />
            </div>
            <div className="cell details">
              <PaperField
                className="cell-input"
                label={`التفاصيل ${index + 1}`}
                flow
                value={line.details}
                arabic={shop.arabicDigits}
                onChange={(details) => patchLine(line.id, { details })}
              />
            </div>
            <div className="cell num">
              <PaperField
                className="cell-input"
                label={`العدد ${index + 1}`}
                flow
                inputMode="decimal"
                value={line.qty}
                arabic={shop.arabicDigits}
                onChange={(qty) => patchLine(line.id, { qty, auto: true, amount: "" })}
              />
            </div>
            <div className="cell num">
              <PaperField
                className="cell-input"
                label={`سعر المفرد ${index + 1}`}
                flow
                inputMode="decimal"
                value={line.price}
                arabic={shop.arabicDigits}
                onChange={(price) => patchLine(line.id, { price, auto: true, amount: "" })}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="grand">
        <div className="grand-val">{formatAmount(total, shop.arabicDigits)}</div>
        <div className="grand-label">المجموع الكلي</div>
      </div>

      <footer className="foot">
        <div className="note-block">
          {words ? <p className="tafqeet">{words}</p> : null}
          <div className="legal">
            <i className="arrow" aria-hidden="true" />
            <PaperField
              className="legal-input"
              label="ملاحظة التذييل"
              value={shop.legal}
              arabic={shop.arabicDigits}
              onChange={(legal) => patchShop({ legal })}
            />
          </div>
        </div>
        <div className="sign-block">
          <div className="sign-area">
            {draft.signature ? <img className="sign-fallback" src={draft.signature} alt="" /> : <span className="sign-fallback" />}
            {compact ? null : (
              <SignaturePad
                uid={draft.id}
                value={draft.signature}
                onChange={(signature) => patchDraft({ signature })}
                className="sign-canvas"
              />
            )}
          </div>
          <div className="sign-label">التوقيع</div>
        </div>
      </footer>
      <p className="sr-only">المجموع {formatAmount(total, shop.arabicDigits) || "صفر"}</p>
    </article>
  );
}
