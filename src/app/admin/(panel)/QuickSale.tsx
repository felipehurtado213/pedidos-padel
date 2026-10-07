"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Sheet } from "@/components/admin/Sheet";
import { useToast } from "@/components/admin/Toaster";
import { CategoryArt } from "@/components/catalog/CategoryArt";
import { formatCOP, formatDateTime, rpcErrorMessage } from "@/lib/format";
import { createClient } from "@/lib/supabase/client";
import type { Product, PromoSaleResult, Promotion, SaleDetailed, SaleResult, UndoResult } from "@/types/db";
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
  promotions: Promotion[];
  dayStartIso: string;
  loadError: string | null;
}

const LONG_PRESS_MS = 450;
const MAX_PER_SALE = 50;
const RECENT_ROWS = 30;

/** "Helado de coco" → "coco" (para mostrar las promos en poco espacio). */
const shortName = (name: string) => name.replace(/^helado de /i, "");

/** Una venta normal, o una promoción (varias filas con el mismo group_id) mostrada como una sola. */
interface RecentEntry {
  key: string;
  saleId: number; // cualquier fila sirve: undo_sale anula el grupo completo
  label: string;
  quantity: number;
  total: number;
  created_at: string;
  isPromo: boolean;
}

function groupRecent(rows: SaleDetailed[]): RecentEntry[] {
  const out: RecentEntry[] = [];
  const groups = new Map<string, { entry: RecentEntry; names: string[]; promo: string }>();
  for (const r of [...rows].sort((a, b) => a.id - b.id)) {
    if (r.group_id) {
      const g = groups.get(r.group_id);
      if (g) {
        g.names.push(shortName(r.product_name));
        g.entry.quantity += r.quantity;
        g.entry.total += r.total;
        g.entry.label = `${g.promo}: ${g.names.join(" + ")}`;
        continue;
      }
      const promo = r.promotion_name ?? "Promo";
      const entry: RecentEntry = {
        key: `g${r.group_id}`,
        saleId: r.id,
        label: `${promo}: ${shortName(r.product_name)}`,
        quantity: r.quantity,
        total: r.total,
        created_at: r.created_at,
        isPromo: true,
      };
      groups.set(r.group_id, { entry, names: [shortName(r.product_name)], promo });
      out.push(entry);
    } else {
      out.push({
        key: `s${r.id}`,
        saleId: r.id,
        label: `${r.product_name} ×${r.quantity}`,
        quantity: r.quantity,
        total: r.total,
        created_at: r.created_at,
        isPromo: false,
      });
    }
  }
  return out.reverse(); // más reciente primero
}

export function QuickSale({ initialProducts, initialTotals, initialRecent, promotions, dayStartIso, loadError }: Props) {
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
  const [promoId, setPromoId] = useState<string | null>(null);
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

  const idle = (id: string) => (inFlight.current.get(id) ?? 0) === 0;

  function trackPending(productId: string, delta: 1 | -1) {
    pendingRef.current += delta;
    setPending(pendingRef.current);
    inFlight.current.set(productId, (inFlight.current.get(productId) ?? 0) + delta);
  }

  const addRecent = (rows: SaleDetailed[]) =>
    setRecent((list) => [...rows, ...list].sort((a, b) => b.id - a.id).slice(0, RECENT_ROWS));

  /** Trae el stock real de varios productos (cuando otro dispositivo vendió antes). */
  async function refreshStocks(ids: string[]) {
    const { data } = await supabase.from("products").select("id, stock").in("id", ids);
    for (const row of (data ?? []) as { id: string; stock: number }[]) {
      if (idle(row.id)) patchStock(row.id, () => row.stock);
    }
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
      if (error?.message.includes("INSUFFICIENT_STOCK")) await refreshStocks([p.id]);
      return;
    }

    const r = data as SaleResult;
    if (idle(p.id)) patchStock(p.id, () => r.stock); // valor real del servidor
    addRecent([
      {
        id: r.sale_id,
        product_id: p.id,
        product_name: p.name,
        quantity,
        unit_price: p.price,
        unit_cost: null,
        total: r.total,
        created_at: new Date().toISOString(),
        group_id: null,
        promotion_name: null,
      },
    ]);
    toast(`✓ ${p.name} ×${quantity} · ${formatCOP(r.total)}`, "success");
    if (r.stock === 0) void revalidateCatalog();
  }

  /** Vende una promoción (ej. 2 helados por $8.000) en una sola operación. */
  async function sellPromo(promo: Promotion, ids: string[]) {
    if (ids.length !== promo.quantity) return;
    const need = new Map<string, number>();
    ids.forEach((id) => need.set(id, (need.get(id) ?? 0) + 1));
    for (const [id, n] of need) {
      const p = products.find((x) => x.id === id);
      if (!p || p.stock < n) {
        toast(`${p?.name ?? "Producto"}: no hay stock suficiente`, "error");
        return;
      }
    }
    const names = ids.map((id) => products.find((p) => p.id === id)?.name ?? "");

    // UI optimista
    need.forEach((n, id) => patchStock(id, (s) => s - n));
    setTotals((t) => ({
      revenue: t.revenue + promo.price,
      units: t.units + ids.length,
      sales_count: t.sales_count + 1,
    }));
    navigator.vibrate?.([25, 30, 25]);
    ids.forEach((id) => trackPending(id, 1));

    const { data, error } = await supabase.rpc("register_promo_sale", {
      p_promotion_id: promo.id,
      p_product_ids: ids,
    });
    ids.forEach((id) => trackPending(id, -1));

    if (error || !data) {
      need.forEach((n, id) => patchStock(id, (s) => s + n));
      setTotals((t) => ({
        revenue: t.revenue - promo.price,
        units: t.units - ids.length,
        sales_count: t.sales_count - 1,
      }));
      toast(`No se registró la promo: ${rpcErrorMessage(error?.message)}`, "error");
      if (error?.message.includes("INSUFFICIENT_STOCK")) await refreshStocks([...need.keys()]);
      return;
    }

    const r = data as PromoSaleResult;
    for (const it of r.items) if (idle(it.product_id)) patchStock(it.product_id, () => it.stock);
    const now = new Date().toISOString();
    addRecent(
      r.items.map((it, i) => ({
        id: it.sale_id,
        product_id: it.product_id,
        product_name: names[i],
        quantity: 1,
        unit_price: it.unit_price,
        unit_cost: null,
        total: it.unit_price,
        created_at: now,
        group_id: r.group_id,
        promotion_name: r.promotion,
      })),
    );
    toast(`✓ Promo ${r.promotion}: ${names.map(shortName).join(" + ")} · ${formatCOP(r.total)}`, "success");
    if (r.items.some((it) => it.stock === 0)) void revalidateCatalog();
  }

  async function undo(entry: RecentEntry) {
    if (pendingRef.current > 0 || undoingId !== null) return;
    setUndoingId(entry.saleId);
    const { data, error } = await supabase.rpc("undo_sale", { p_sale_id: entry.saleId });
    setUndoingId(null);

    if (error || !data) {
      if (error?.message.includes("NOTHING_TO_UNDO")) {
        // Ya la había anulado alguien más: la quitamos de la lista.
        router.refresh();
        toast("Esa venta ya estaba anulada.", "info");
      } else {
        toast(rpcErrorMessage(error?.message), "error");
      }
      return;
    }

    const r = data as UndoResult;
    const wasSoldOut = r.items.some((it) => products.find((p) => p.id === it.product_id)?.stock === 0);
    for (const it of r.items) patchStock(it.product_id, () => it.stock);
    if (entry.created_at >= dayStartIso) {
      setTotals((t) => ({
        revenue: t.revenue - r.total,
        units: t.units - r.quantity,
        sales_count: t.sales_count - 1,
      }));
    }
    const removed = new Set(r.items.map((it) => it.sale_id));
    setRecent((list) => list.filter((s) => !removed.has(s.id)));
    navigator.vibrate?.([15, 40, 15]);
    toast(`↩ Anulada: ${entry.label}`, "info");
    if (wasSoldOut) void revalidateCatalog(); // volvió a estar disponible
  }

  const entries = useMemo(() => groupRecent(recent), [recent]);
  const last = entries[0];
  const sheetProduct = sheetProductId ? products.find((p) => p.id === sheetProductId) ?? null : null;
  const activePromo = promoId ? promotions.find((p) => p.id === promoId) ?? null : null;
  // Promos que se pueden vender ahora (hay productos activos de esa categoría).
  const sellablePromos = promotions.filter((pr) => products.some((p) => p.category === pr.category));

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

      {/* Promociones: se venden con su precio especial para que la caja cuadre */}
      {sellablePromos.map((pr) => (
        <button
          key={pr.id}
          type="button"
          onClick={() => setPromoId(pr.id)}
          className="mb-3 flex w-full items-center gap-3 rounded-3xl bg-gradient-to-r from-chile-dark to-chile px-4 py-3 text-left text-white shadow-card transition active:scale-[0.98]"
        >
          <span aria-hidden className="text-3xl">
            {pr.category === "helados" ? "🍦" : "🎉"}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-display text-xl leading-tight font-bold">
              Promo {pr.name} · {formatCOP(pr.price)}
            </span>
            <span className="block text-sm font-bold opacity-90">Toca y elige los sabores</span>
          </span>
          <span aria-hidden className="text-3xl leading-none">›</span>
        </button>
      ))}

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
                {last.label} · {formatCOP(last.total)}
              </span>
            </button>
            <button
              type="button"
              onClick={() => undo(last)}
              disabled={pending > 0 || undoingId !== null}
              className="h-12 shrink-0 rounded-xl bg-mango px-4 font-display text-lg font-semibold text-tamarindo-dark transition active:scale-95 disabled:opacity-50"
            >
              {undoingId === last.saleId ? "…" : "↩ Deshacer"}
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

      {/* Vender una promoción: elegir sabores */}
      <Sheet
        open={activePromo !== null}
        onClose={() => setPromoId(null)}
        title={activePromo ? `Promo ${activePromo.name}` : "Promo"}
      >
        {activePromo && (
          <PromoPicker
            key={activePromo.id}
            promo={activePromo}
            products={products.filter((p) => p.category === activePromo.category)}
            onConfirm={(ids) => {
              setPromoId(null);
              void sellPromo(activePromo, ids);
            }}
          />
        )}
      </Sheet>

      {/* Últimas ventas, con opción de anular cualquiera */}
      <Sheet open={showRecent} onClose={() => setShowRecent(false)} title="Últimas ventas">
        {entries.length === 0 ? (
          <p className="text-ink/70">Aún no hay ventas.</p>
        ) : (
          <ul className="divide-y divide-arena rounded-2xl bg-white shadow-sm">
            {entries.map((e) => (
              <li key={e.key} className="flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold">
                    {e.isPromo && <span aria-hidden>🍦 </span>}
                    {e.label}
                  </p>
                  <p className="text-sm text-ink/70">
                    {formatCOP(e.total)} · {formatDateTime(e.created_at)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => undo(e)}
                  disabled={pending > 0 || undoingId !== null}
                  className="h-11 shrink-0 rounded-xl bg-chile-soft px-3 text-sm font-bold text-chile-dark disabled:opacity-50"
                >
                  {undoingId === e.saleId ? "…" : "Anular"}
                </button>
              </li>
            ))}
          </ul>
        )}
      </Sheet>
    </>
  );
}

/** Elegir los sabores de una promoción (se puede repetir sabor). */
function PromoPicker({
  promo,
  products,
  onConfirm,
}: {
  promo: Promotion;
  products: QuickProduct[];
  onConfirm: (ids: string[]) => void;
}) {
  const [picked, setPicked] = useState<string[]>([]);
  const count = (id: string) => picked.filter((x) => x === id).length;
  const full = picked.length >= promo.quantity;
  const nameOf = (id: string) => shortName(products.find((p) => p.id === id)?.name ?? "");
  const normal = picked.reduce((s, id) => s + (products.find((p) => p.id === id)?.price ?? 0), 0);

  return (
    <div className="space-y-4">
      <p className="text-ink/70">
        Toca {promo.quantity} {promo.quantity === 2 ? "sabores" : "productos"} (puedes repetir). Total{" "}
        <strong className="text-ink">{formatCOP(promo.price)}</strong>.
      </p>

      <div className="grid grid-cols-2 gap-2">
        {products.map((p) => {
          const left = p.stock - count(p.id);
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => setPicked((x) => [...x, p.id])}
              disabled={full || left <= 0}
              className="relative flex min-h-20 flex-col justify-center rounded-2xl bg-white p-3 text-left shadow-sm transition active:scale-95 disabled:opacity-40"
            >
              <span className="font-display text-lg leading-tight font-semibold text-tamarindo-dark capitalize">
                {shortName(p.name)}
              </span>
              <span className="text-xs font-bold text-ink/70">{left > 0 ? `${left} disp.` : "Agotado"}</span>
              {count(p.id) > 0 && (
                <span className="absolute top-2 right-2 grid size-7 place-items-center rounded-full bg-chile-dark text-sm font-extrabold text-white">
                  ×{count(p.id)}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Lo elegido: tocar para quitar */}
      <div className="flex flex-wrap gap-2" aria-live="polite">
        {Array.from({ length: promo.quantity }, (_, i) =>
          picked[i] ? (
            <button
              key={i}
              type="button"
              onClick={() => setPicked((x) => x.filter((_, j) => j !== i))}
              className="h-11 rounded-xl bg-mango-soft px-3 font-bold text-tamarindo-dark capitalize"
              aria-label={`Quitar ${nameOf(picked[i])}`}
            >
              {nameOf(picked[i])} ✕
            </button>
          ) : (
            <span key={i} className="grid h-11 place-items-center rounded-xl border-2 border-dashed border-arena px-3 text-sm font-bold text-ink/70">
              Sabor {i + 1}
            </span>
          ),
        )}
      </div>

      <button
        type="button"
        onClick={() => onConfirm(picked)}
        disabled={!full}
        className="h-16 w-full rounded-2xl bg-limon-dark font-display text-xl font-semibold text-white shadow-[0_4px_0_0_#365807] transition active:translate-y-1 active:shadow-none disabled:opacity-40 disabled:shadow-none"
      >
        {full ? `Vender promo · ${formatCOP(promo.price)}` : `Elige ${promo.quantity - picked.length} más`}
      </button>
      {full && normal > promo.price && (
        <p className="text-center text-sm text-ink/70">
          Precio normal {formatCOP(normal)} · el cliente ahorra {formatCOP(normal - promo.price)}
        </p>
      )}
    </div>
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
