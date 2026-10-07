"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Sheet } from "@/components/admin/Sheet";
import { useToast } from "@/components/admin/Toaster";
import { CategoryArt } from "@/components/catalog/CategoryArt";
import { formatCOP, formatDateTime, rpcErrorMessage } from "@/lib/format";
import { createClient } from "@/lib/supabase/client";
import type { Product, SaleDetailed, SaleResult } from "@/types/db";
import { revalidateCatalog } from "./actions";

export type QuickProduct = Pick<
  Product,
  "id" | "name" | "price" | "stock" | "low_stock_threshold" | "image_url" | "category"
>;

interface Totals {
  revenue: number;
  units: number;
  sales_count: number;
}

interface Props {
  initialProducts: QuickProduct[];
  initialTotals: Totals;
  initialRecent: SaleDetailed[];
  dayStartIso: string;
  loadError: string | null;
}

const LONG_PRESS_MS = 450;
const MAX_PER_SALE = 50;

export function QuickSale({ initialProducts, initialTotals, initialRecent, dayStartIso, loadError }: Props) {
  const supabase = useMemo(() => createClient(), []);
  const toast = useToast();
  const router = useRouter();

  const [products, setProducts] = useState(initialProducts);
  const [totals, setTotals] = useState(initialTotals);
  const [recent, setRecent] = useState(initialRecent);
  const [perTap, setPerTap] = useState(1); // cantidad por toque
  const [pending, setPending] = useState(0);
  const [undoingId, setUndoingId] = useState<number | null>(null);
  const [flash, setFlash] = useState<Record<string, { n: number; qty: number }>>({});
  const [sheetProductId, setSheetProductId] = useState<string | null>(null);
  const [showRecent, setShowRecent] = useState(false);

  // Ventas en vuelo por producto: mientras haya alguna, no pisamos el stock local con el del servidor.
  const inFlight = useRef(new Map<string, number>());
  const pendingRef = useRef(0);

  // Al volver a la pestaña/app, traer datos frescos (otro dispositivo pudo vender).
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible" && pendingRef.current === 0) router.refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [router]);

  const patchStock = (id: string, fn: (s: number) => number) =>
    setProducts((ps) => ps.map((p) => (p.id === id ? { ...p, stock: fn(p.stock) } : p)));

  function trackPending(productId: string, delta: 1 | -1) {
    pendingRef.current += delta;
    setPending(pendingRef.current);
    inFlight.current.set(productId, (inFlight.current.get(productId) ?? 0) + delta);
  }

  async function sell(p: QuickProduct, quantity: number) {
    if (quantity < 1 || quantity > MAX_PER_SALE) return;
    if (quantity > p.stock) {
      toast(p.stock === 0 ? `${p.name}: agotado` : `${p.name}: solo quedan ${p.stock}`, "error");
      return;
    }

    // 1) UI optimista: se ve al instante.
    const amount = p.price * quantity;
    patchStock(p.id, (s) => s - quantity);
    setTotals((t) => ({ revenue: t.revenue + amount, units: t.units + quantity, sales_count: t.sales_count + 1 }));
    setFlash((f) => ({ ...f, [p.id]: { n: (f[p.id]?.n ?? 0) + 1, qty: quantity } }));
    navigator.vibrate?.(25);
    if (perTap !== 1) setPerTap(1); // volver a 1 para no vender de más por accidente
    trackPending(p.id, 1);

    // 2) Registro atómico en la base de datos (verifica admin y stock).
    const { data, error } = await supabase.rpc("register_sale", { p_product_id: p.id, p_quantity: quantity });
    trackPending(p.id, -1);

    if (error || !data) {
      patchStock(p.id, (s) => s + quantity);
      setTotals((t) => ({ revenue: t.revenue - amount, units: t.units - quantity, sales_count: t.sales_count - 1 }));
      toast(`No se registró ${p.name}: ${rpcErrorMessage(error?.message)}`, "error");
      // Otro dispositivo vendió antes: traer el stock real para no seguir mostrando uno viejo.
      if (error?.message.includes("INSUFFICIENT_STOCK")) {
        const { data: fresh } = await supabase.from("products").select("stock").eq("id", p.id).maybeSingle();
        if (fresh && (inFlight.current.get(p.id) ?? 0) === 0) patchStock(p.id, () => fresh.stock as number);
      }
      return;
    }

    const r = data as SaleResult;
    if ((inFlight.current.get(p.id) ?? 0) === 0) patchStock(p.id, () => r.stock); // valor real del servidor
    setRecent((list) =>
      [
        {
          id: r.sale_id,
          product_id: p.id,
          product_name: p.name,
          quantity,
          unit_price: p.price,
          unit_cost: null,
          total: r.total,
          created_at: new Date().toISOString(),
        },
        ...list,
      ]
        .sort((a, b) => b.id - a.id)
        .slice(0, 15),
    );
    toast(`✓ ${p.name} ×${quantity} · ${formatCOP(r.total)}`, "success");
    if (r.stock === 0) void revalidateCatalog();
  }

  async function undo(sale: SaleDetailed) {
    if (pendingRef.current > 0 || undoingId !== null) return;
    setUndoingId(sale.id);
    const { data, error } = await supabase.rpc("undo_sale", { p_sale_id: sale.id });
    setUndoingId(null);

    if (error || !data) {
      if (error?.message.includes("NOTHING_TO_UNDO")) {
        // Ya la había anulado alguien más: la quitamos de la lista.
        setRecent((list) => list.filter((s) => s.id !== sale.id));
        toast("Esa venta ya estaba anulada.", "info");
      } else {
        toast(rpcErrorMessage(error?.message), "error");
      }
      return;
    }

    const r = data as SaleResult;
    const before = products.find((p) => p.id === r.product_id)?.stock;
    patchStock(r.product_id, () => r.stock);
    if (sale.created_at >= dayStartIso) {
      setTotals((t) => ({
        revenue: t.revenue - sale.total,
        units: t.units - sale.quantity,
        sales_count: t.sales_count - 1,
      }));
    }
    setRecent((list) => list.filter((s) => s.id !== sale.id));
    navigator.vibrate?.([15, 40, 15]);
    toast(`↩ Anulada: ${sale.product_name} ×${sale.quantity}`, "info");
    if (before === 0) void revalidateCatalog(); // volvió a estar disponible
  }

  const last = recent[0];
  const sheetProduct = sheetProductId ? products.find((p) => p.id === sheetProductId) ?? null : null;

  return (
    <>
      {/* Resumen del día */}
      <section
        aria-label="Ventas de hoy"
        className="mb-3 flex items-center justify-between gap-3 rounded-3xl bg-gradient-to-br from-mango to-chile px-4 py-3 text-tamarindo-dark shadow-card"
      >
        <div>
          <p className="text-xs font-extrabold tracking-wide uppercase opacity-80">Vendido hoy</p>
          <p className="font-display text-3xl leading-tight font-bold tabular-nums">{formatCOP(totals.revenue)}</p>
        </div>
        <div className="text-right text-sm font-bold">
          <p className="tabular-nums">{totals.units} uds</p>
          <p className="tabular-nums opacity-80">{totals.sales_count} ventas</p>
          <p aria-live="polite" className="h-4 text-xs opacity-80">
            {pending > 0 ? "Guardando…" : ""}
          </p>
        </div>
      </section>

      {/* Cantidad por toque */}
      <div className="mb-3 flex items-center gap-2" role="radiogroup" aria-label="Unidades por toque">
        <span className="shrink-0 text-sm font-bold text-tamarindo">Por toque:</span>
        <div className="grid flex-1 grid-cols-5 gap-1.5">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={perTap === n}
              onClick={() => setPerTap(n)}
              className={`h-11 rounded-xl font-display text-lg font-semibold transition ${
                perTap === n ? "bg-tamarindo text-white shadow" : "bg-white text-tamarindo shadow-sm"
              }`}
            >
              ×{n}
            </button>
          ))}
        </div>
      </div>
      <p className="mb-3 text-xs text-ink/70">
        Toca para vender {perTap === 1 ? "1 unidad" : `${perTap} unidades`}. Mantén presionado para elegir otra cantidad.
      </p>

      {loadError && (
        <p role="alert" className="mb-3 rounded-2xl bg-chile-soft px-4 py-3 font-bold text-chile-dark">
          {loadError}
        </p>
      )}

      {/* Botones de venta */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {products.map((p) => (
          <SaleButton
            key={p.id}
            product={p}
            perTap={perTap}
            flash={flash[p.id]}
            onSell={(q) => sell(p, q)}
            onLongPress={() => setSheetProductId(p.id)}
          />
        ))}
      </div>

      {products.length === 0 && !loadError && (
        <p className="rounded-3xl bg-white p-6 text-center shadow-card">
          No hay productos activos. Créalos o actívalos en Inventario.
        </p>
      )}

      {/* Espacio para que la barra de deshacer no tape el último botón */}
      <div className="h-20" />

      {/* Barra "Deshacer última venta" */}
      {last && (
        <div className="fixed inset-x-0 bottom-16 z-30 px-3 pb-[env(safe-area-inset-bottom)]">
          <div className="animate-fade-up mx-auto flex max-w-3xl items-center gap-2 rounded-2xl bg-tamarindo-dark p-2 pl-4 text-white shadow-2xl">
            <button type="button" onClick={() => setShowRecent(true)} className="min-w-0 flex-1 text-left">
              <span className="block text-[11px] font-bold tracking-wide uppercase opacity-70">
                Última venta · ver todas
              </span>
              <span className="block truncate font-bold">
                {last.product_name} ×{last.quantity} · {formatCOP(last.total)}
              </span>
            </button>
            <button
              type="button"
              onClick={() => undo(last)}
              disabled={pending > 0 || undoingId !== null}
              className="h-12 shrink-0 rounded-xl bg-mango px-4 font-display text-lg font-semibold text-tamarindo-dark transition active:scale-95 disabled:opacity-50"
            >
              {undoingId === last.id ? "…" : "↩ Deshacer"}
            </button>
          </div>
        </div>
      )}

      {/* Vender varias unidades (mantener presionado) */}
      <Sheet open={sheetProduct !== null} onClose={() => setSheetProductId(null)} title={sheetProduct?.name ?? "Vender"}>
        {sheetProduct && (
          <QuantityPicker
            product={sheetProduct}
            onConfirm={(q) => {
              setSheetProductId(null);
              void sell(sheetProduct, q);
            }}
          />
        )}
      </Sheet>

      {/* Últimas ventas, con opción de anular cualquiera */}
      <Sheet open={showRecent} onClose={() => setShowRecent(false)} title="Últimas ventas">
        {recent.length === 0 ? (
          <p className="text-ink/70">Aún no hay ventas.</p>
        ) : (
          <ul className="divide-y divide-arena rounded-2xl bg-white shadow-sm">
            {recent.map((s) => (
              <li key={s.id} className="flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold">
                    {s.product_name} ×{s.quantity}
                  </p>
                  <p className="text-sm text-ink/70">
                    {formatCOP(s.total)} · {formatDateTime(s.created_at)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => undo(s)}
                  disabled={pending > 0 || undoingId !== null}
                  className="h-11 shrink-0 rounded-xl bg-chile-soft px-3 text-sm font-bold text-chile-dark disabled:opacity-50"
                >
                  {undoingId === s.id ? "…" : "Anular"}
                </button>
              </li>
            ))}
          </ul>
        )}
      </Sheet>
    </>
  );
}

/* ------------------------------------------------------------------ */

function SaleButton({
  product: p,
  perTap,
  flash,
  onSell,
  onLongPress,
}: {
  product: QuickProduct;
  perTap: number;
  flash?: { n: number; qty: number };
  onSell: (qty: number) => void;
  onLongPress: () => void;
}) {
  const timer = useRef<number | null>(null);
  const longPressed = useRef(false);
  const soldOut = p.stock <= 0;
  const low = !soldOut && p.stock <= p.low_stock_threshold;

  const clear = () => {
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = null;
  };

  return (
    <button
      type="button"
      disabled={soldOut}
      onPointerDown={() => {
        longPressed.current = false;
        clear();
        timer.current = window.setTimeout(() => {
          longPressed.current = true;
          navigator.vibrate?.(40);
          onLongPress();
        }, LONG_PRESS_MS);
      }}
      onPointerUp={clear}
      onPointerLeave={clear}
      onPointerCancel={clear}
      onContextMenu={(e) => e.preventDefault()}
      onClick={() => {
        // El click llega después del pointerup: si fue presión larga, no vender.
        if (longPressed.current) {
          longPressed.current = false;
          return;
        }
        onSell(perTap);
      }}
      aria-label={`Vender ${perTap} ${p.name}, ${formatCOP(p.price)}. Stock ${p.stock}`}
      className={`relative flex min-h-40 touch-manipulation flex-col overflow-hidden rounded-3xl border-[3px] bg-white p-3 text-left shadow-card transition select-none [-webkit-touch-callout:none] active:scale-[0.96] disabled:active:scale-100 ${
        soldOut ? "border-transparent opacity-50 grayscale" : low ? "border-chile" : "border-transparent"
      }`}
    >
      <span className="flex items-start justify-between gap-2">
        <span className="size-12 shrink-0 overflow-hidden rounded-xl bg-arena">
          {p.image_url ? (
            <Image src={p.image_url} alt="" width={96} height={96} className="size-full object-cover" />
          ) : (
            <CategoryArt category={p.category} className="size-full" />
          )}
        </span>
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-extrabold tabular-nums ${
            soldOut
              ? "bg-tamarindo-soft text-tamarindo"
              : low
                ? "animate-pulse bg-chile-dark text-white"
                : "bg-limon-soft text-limon-dark"
          }`}
        >
          {soldOut ? "Agotado" : low ? `¡Quedan ${p.stock}!` : `${p.stock} disp.`}
        </span>
      </span>

      <span className="mt-2 line-clamp-2 font-display text-lg leading-tight font-semibold text-tamarindo-dark">
        {p.name}
      </span>
      <span className="mt-auto pt-1 font-display text-xl font-bold text-chile">{formatCOP(p.price)}</span>

      {/* Burbuja "−1" que sube al vender */}
      {flash && (
        <span
          key={flash.n}
          aria-hidden
          className="animate-pop pointer-events-none absolute top-1/2 right-3 font-display text-3xl font-bold text-limon-dark"
        >
          −{flash.qty}
        </span>
      )}
    </button>
  );
}

function QuantityPicker({ product, onConfirm }: { product: QuickProduct; onConfirm: (qty: number) => void }) {
  const max = Math.min(product.stock, MAX_PER_SALE);
  const [qty, setQty] = useState(Math.min(2, max));
  const clamp = (n: number) => Math.max(1, Math.min(max, n));

  if (max < 1) return <p className="text-ink/70">Este producto está agotado.</p>;

  return (
    <div className="space-y-4">
      <p className="text-ink/70">
        {formatCOP(product.price)} c/u · {product.stock} disponibles
      </p>
      <div className="flex items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => setQty((q) => clamp(q - 1))}
          disabled={qty <= 1}
          className="grid size-16 place-items-center rounded-2xl bg-white text-3xl font-bold text-tamarindo shadow-sm disabled:opacity-30"
          aria-label="Una menos"
        >
          −
        </button>
        <output className="w-20 text-center font-display text-5xl font-bold tabular-nums" aria-live="polite">
          {qty}
        </output>
        <button
          type="button"
          onClick={() => setQty((q) => clamp(q + 1))}
          disabled={qty >= max}
          className="grid size-16 place-items-center rounded-2xl bg-white text-3xl font-bold text-tamarindo shadow-sm disabled:opacity-30"
          aria-label="Una más"
        >
          +
        </button>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        {[2, 3, 4, 5, 6, 10, 12].filter((n) => n <= max).map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setQty(n)}
            className={`h-11 min-w-12 rounded-xl px-3 font-bold ${qty === n ? "bg-tamarindo text-white" : "bg-white text-tamarindo shadow-sm"}`}
          >
            {n}
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={() => onConfirm(qty)}
        className="h-16 w-full rounded-2xl bg-limon-dark font-display text-xl font-semibold text-white shadow-[0_4px_0_0_#365807] active:translate-y-1 active:shadow-none"
      >
        Vender {qty} · {formatCOP(product.price * qty)}
      </button>
    </div>
  );
}
