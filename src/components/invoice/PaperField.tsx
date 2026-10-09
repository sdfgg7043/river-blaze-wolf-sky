import { useState, type KeyboardEvent } from "react";
import { normalizeDigits, toArabicDigits } from "@/lib/invoice/format";

type Props = {
  value: string;
  onChange: (value: string) => void;
  arabic: boolean;
  className?: string;
  label: string;
  maxLength?: number;
  flow?: boolean;
  inputMode?: "text" | "decimal" | "numeric";
  onBlurValue?: (value: string) => void;
};

export function focusNextFlow(current: HTMLElement) {
  const root = document.getElementById("invoice-sheet");
  if (!root) return;
  const fields = [...root.querySelectorAll<HTMLElement>("[data-flow]")];
  const index = fields.indexOf(current);
  fields[index + 1]?.focus();
}

export function PaperField({
  value,
  onChange,
  arabic,
  className,
  label,
  maxLength,
  flow,
  inputMode = "text",
  onBlurValue,
}: Props) {
  const [focus, setFocus] = useState(false);
  const shown = !arabic || focus ? value : toArabicDigits(value);

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (!flow || event.key !== "Enter") return;
    event.preventDefault();
    focusNextFlow(event.currentTarget);
  }

  return (
    <input
      className={className}
      aria-label={label}
      value={shown}
      maxLength={maxLength}
      inputMode={inputMode}
      autoComplete="off"
      spellCheck={false}
      data-flow={flow ? "" : undefined}
      onFocus={() => setFocus(true)}
      onBlur={(event) => {
        setFocus(false);
        onBlurValue?.(normalizeDigits(event.currentTarget.value));
      }}
      onChange={(event) => onChange(normalizeDigits(event.currentTarget.value))}
      onKeyDown={onKeyDown}
    />
  );
}
