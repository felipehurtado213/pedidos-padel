"use client";

import type { InputHTMLAttributes, ReactNode } from "react";

export const inputClass =
  "h-13 w-full rounded-2xl border-2 border-arena bg-white px-4 text-lg outline-none transition focus:border-mango-dark aria-invalid:border-chile";

export function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1 block font-bold text-tamarindo-dark">
        {label}
      </label>
      {children}
      {hint && <p className="mt-1 text-sm text-ink/70">{hint}</p>}
    </div>
  );
}

const groupThousands = (digits: string) => digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");

type BaseProps = Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type">;

/** Campo de pesos: solo dígitos, se muestra como $12.000 mientras escribes. value = "" o dígitos. */
export function MoneyInput({ value, onChange, ...rest }: BaseProps & { value: string; onChange: (digits: string) => void }) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-lg font-bold text-tamarindo/80">
        $
      </span>
      <input
        {...rest}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        value={groupThousands(value)}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, "").replace(/^0+(?=\d)/, "").slice(0, 8))}
        className={`${inputClass} pl-8 font-semibold tabular-nums`}
      />
    </div>
  );
}

/** Entero positivo (stock, umbrales...). value = "" o dígitos. */
export function IntInput({
  value,
  onChange,
  maxDigits = 6,
  ...rest
}: BaseProps & { value: string; onChange: (digits: string) => void; maxDigits?: number }) {
  return (
    <input
      {...rest}
      type="text"
      inputMode="numeric"
      autoComplete="off"
      value={value}
      onChange={(e) => onChange(e.target.value.replace(/\D/g, "").replace(/^0+(?=\d)/, "").slice(0, maxDigits))}
      className={`${inputClass} font-semibold tabular-nums`}
    />
  );
}

/** Interruptor grande accesible (role=switch). */
export function Toggle({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3 text-left shadow-sm"
    >
      <span>
        <span className="block font-bold text-tamarindo-dark">{label}</span>
        {description && <span className="block text-sm text-ink/70">{description}</span>}
      </span>
      <span
        aria-hidden
        className={`relative h-8 w-14 shrink-0 rounded-full transition ${checked ? "bg-limon-dark" : "bg-tamarindo/25"}`}
      >
        <span
          className={`absolute top-1 size-6 rounded-full bg-white shadow transition-all ${checked ? "left-7" : "left-1"}`}
        />
      </span>
    </button>
  );
}
