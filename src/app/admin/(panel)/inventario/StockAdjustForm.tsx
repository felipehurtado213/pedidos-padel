"use client";

import { useEffect, useState, useTransition } from "react";
import { Field, IntInput, inputClass } from "@/components/admin/inputs";
import { useToast } from "@/components/admin/Toaster";
import { formatDateTime, STOCK_REASON_LABELS } from "@/lib/format";
import { createClient } from "@/lib/supabase/client";
import type { Product, StockMovement } from "@/types/db";
import { adjustStock } from "./actions";

type Mode = "add" | "remove";

export function StockAdjustForm({ product, onClose }: { product: Product; onClose: () => void }) {
  const toast = useToast();
  const [mode, setMode] = useState<Mode>("add");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState<"reposicion" | "ajuste">("reposicion");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<StockMovement[] | null>(null);
  const [pending, startTransition] = useTransition();

  // Historial de movimientos (RLS: solo el admin puede leerlo).
  useEffect(() => {
    let alive = true;
    createClient()
      .from("stock_movements")
      .select("id, product_id, delta, reason, sale_id, note, created_at")
      .eq("product_id", product.id)
      .order("id", { ascending: false })
      .limit(15)
      .then(({ data }) => {
        if (alive) setHistory((data as StockMovement[]) ?? []);
      });
    return () => {
      alive = false;
    };
  }, [product.id, product.stock]);

  const qty = Number(amount || 0);
  const delta = mode === "add" ? qty : -qty;
  const result = product.stock + delta;
  const invalid = qty === 0 || result < 0;

  function changeMode(m: Mode) {
    setMode(m);
    setReason(m === "add" ? "reposicion" : "ajuste");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (invalid) return;
    setError(null);
    startTransition(async () => {
      const r = await adjustStock({ productId: product.id, delta, reason, note: note.trim() || undefined });
      if (!r.ok) return setError(r.error);
      toast(`${product.name}: stock ${r.data.stock}`, "success");
      onClose();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <div className="grid grid-cols-2 gap-2 rounded-2xl bg-white p-1 shadow-sm" role="radiogroup" aria-label="Tipo de ajuste">
        {(["add", "remove"] as const).map((m) => (
          <button
            key={m}
            type="button"
            role="radio"
            aria-checked={mode === m}
            onClick={() => changeMode(m)}
            className={`h-12 rounded-xl font-display text-lg font-semibold transition ${
              mode === m ? (m === "add" ? "bg-limon-dark text-white" : "bg-chile-dark text-white") : "text-tamarindo"
            }`}
          >
            {m === "add" ? "+ Sumar" : "− Restar"}
          </button>
        ))}
      </div>

      <Field label="Cantidad" htmlFor="sa-qty">
        <IntInput id="sa-qty" value={amount} onChange={setAmount} maxDigits={5} placeholder="0" />
        <div className="mt-2 flex flex-wrap gap-2">
          {[1, 5, 10, 20, 50].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setAmount((a) => String(Math.min(99_999, Number(a || 0) + n)))}
              className="h-11 min-w-14 rounded-xl bg-white px-3 font-bold text-tamarindo shadow-sm active:scale-95"
            >
              +{n}
            </button>
          ))}
          {amount && (
            <button type="button" onClick={() => setAmount("")} className="h-11 rounded-xl px-3 font-bold text-ink/70">
              Borrar
            </button>
          )}
        </div>
      </Field>

      <Field label="Motivo" htmlFor="sa-reason">
        <select
          id="sa-reason"
          value={reason}
          onChange={(e) => setReason(e.target.value as "reposicion" | "ajuste")}
          className={inputClass}
        >
          <option value="reposicion">Reposición (llegó mercancía)</option>
          <option value="ajuste">Ajuste (conteo, daño, regalo…)</option>
        </select>
      </Field>

      <Field label="Nota (opcional)" htmlFor="sa-note">
        <input
          id="sa-note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={200}
          className={inputClass}
          placeholder="Ej: se derritieron 2"
        />
      </Field>

      <p className="rounded-2xl bg-white px-4 py-3 text-center text-lg shadow-sm">
        Stock: <strong>{product.stock}</strong> →{" "}
        <strong className={result < 0 ? "text-chile-dark" : "text-limon-dark"}>{result}</strong>
      </p>

      {error && (
        <p role="alert" className="rounded-2xl bg-chile-soft px-4 py-3 font-bold text-chile-dark">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending || invalid}
        className="h-14 w-full rounded-2xl bg-tamarindo font-display text-xl font-semibold text-white transition active:translate-y-0.5 disabled:opacity-50"
      >
        {pending ? "Guardando…" : result < 0 ? "No puede quedar negativo" : "Aplicar ajuste"}
      </button>

      <section aria-label="Historial de movimientos" className="pt-2">
        <h3 className="mb-2 font-display text-lg font-semibold text-tamarindo">Últimos movimientos</h3>
        {history === null ? (
          <p className="text-ink/70">Cargando…</p>
        ) : history.length === 0 ? (
          <p className="text-ink/70">Sin movimientos.</p>
        ) : (
          <ul className="divide-y divide-arena rounded-2xl bg-white shadow-sm">
            {history.map((m) => (
              <li key={m.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                <span className="min-w-0">
                  <span className="font-bold">{STOCK_REASON_LABELS[m.reason] ?? m.reason}</span>
                  {m.note && <span className="block truncate text-ink/70">{m.note}</span>}
                  <span className="block text-xs text-ink/70">{formatDateTime(m.created_at)}</span>
                </span>
                <span className={`font-display text-lg font-semibold ${m.delta > 0 ? "text-limon-dark" : "text-chile-dark"}`}>
                  {m.delta > 0 ? `+${m.delta}` : m.delta}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </form>
  );
}
