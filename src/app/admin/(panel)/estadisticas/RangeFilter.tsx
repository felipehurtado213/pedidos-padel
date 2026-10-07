"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { inputClass } from "@/components/admin/inputs";

export type Range = "hoy" | "todo" | "fechas";

const OPTIONS: { value: Range; label: string }[] = [
  { value: "hoy", label: "Hoy" },
  { value: "todo", label: "Todo el evento" },
  { value: "fechas", label: "Fechas" },
];

/** Filtro de rango: una sola fila arriba de los gráficos; se refleja en la URL. */
export function RangeFilter({ range, desde, hasta, today }: { range: Range; desde: string; hasta: string; today: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [selected, setSelected] = useState<Range>(range);
  const [from, setFrom] = useState(desde);
  const [to, setTo] = useState(hasta);

  const go = (query: string) => startTransition(() => router.push(`/admin/estadisticas${query}`, { scroll: false }));

  function choose(r: Range) {
    setSelected(r);
    if (r === "hoy") go("");
    if (r === "todo") go("?rango=todo");
  }

  return (
    <div className={`space-y-2 transition-opacity ${pending ? "opacity-60" : ""}`} aria-busy={pending}>
      <div role="radiogroup" aria-label="Rango de fechas" className="grid grid-cols-3 gap-1 rounded-2xl bg-white p-1 shadow-sm">
        {OPTIONS.map((o) => (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={selected === o.value}
            onClick={() => choose(o.value)}
            className={`h-11 rounded-xl text-sm font-bold transition ${
              selected === o.value ? "bg-tamarindo text-white" : "text-tamarindo"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>

      {selected === "fechas" && (
        <form
          className="flex items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            go(`?rango=fechas&desde=${from}&hasta=${to}`);
          }}
        >
          <label className="flex-1 text-sm font-bold text-tamarindo-dark">
            Desde
            <input type="date" value={from} max={today} onChange={(e) => setFrom(e.target.value)} className={`${inputClass} mt-1 text-base`} required />
          </label>
          <label className="flex-1 text-sm font-bold text-tamarindo-dark">
            Hasta
            <input type="date" value={to} max={today} onChange={(e) => setTo(e.target.value)} className={`${inputClass} mt-1 text-base`} required />
          </label>
          <button type="submit" className="h-13 rounded-2xl bg-mango px-4 font-bold text-tamarindo-dark">
            Ver
          </button>
        </form>
      )}
    </div>
  );
}
