"use client";

import Image from "next/image";
import { useOptimistic, useState, useTransition } from "react";
import { Sheet } from "@/components/admin/Sheet";
import { useToast } from "@/components/admin/Toaster";
import { CategoryArt } from "@/components/catalog/CategoryArt";
import { formatCOP } from "@/lib/format";
import type { Product, Promotion } from "@/types/db";
import { adjustStock } from "./actions";
import { ProductForm } from "./ProductForm";
import { PromotionForm } from "./PromotionForm";
import { StockAdjustForm } from "./StockAdjustForm";

type Editing = { kind: "new" } | { kind: "edit"; id: string } | null;

export function InventoryManager({
  products,
  promotions,
  loadError,
}: {
  products: Product[];
  promotions: Promotion[];
  loadError: string | null;
}) {
  const toast = useToast();
  const [editing, setEditing] = useState<Editing>(null);
  const [adjustingId, setAdjustingId] = useState<string | null>(null);
  const [promoSheet, setPromoSheet] = useState<{ id: string | null } | null>(null);
  const [, startTransition] = useTransition();

  // Los botones +/− actualizan el número al instante; el servidor confirma después.
  const [items, applyDelta] = useOptimistic(products, (state, a: { id: string; delta: number }) =>
    state.map((p) => (p.id === a.id ? { ...p, stock: p.stock + a.delta } : p)),
  );

  function quickAdjust(p: Product, delta: number) {
    if (p.stock + delta < 0) return;
    startTransition(async () => {
      applyDelta({ id: p.id, delta });
      const r = await adjustStock({
        productId: p.id,
        delta,
        reason: delta > 0 ? "reposicion" : "ajuste",
        note: "Botón rápido",
      });
      if (!r.ok) toast(r.error, "error");
    });
  }

  const editingProduct = editing?.kind === "edit" ? items.find((p) => p.id === editing.id) ?? null : null;
  const adjusting = adjustingId ? items.find((p) => p.id === adjustingId) ?? null : null;
  const nextSortOrder = items.reduce((max, p) => Math.max(max, p.sort_order), 0) + 10;

  const lowCount = items.filter((p) => p.is_active && p.stock <= p.low_stock_threshold).length;
  const totalUnits = items.reduce((s, p) => s + p.stock, 0);
  const costValue = items.reduce((s, p) => s + p.stock * (p.unit_cost ?? 0), 0);

  return (
    <>
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold text-tamarindo">Inventario</h1>
          <p className="text-sm text-ink/70">
            {totalUnits} uds{costValue > 0 && ` · ${formatCOP(costValue)} a costo`}
            {lowCount > 0 && <span className="font-bold text-chile-dark"> · {lowCount} con poco stock</span>}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setEditing({ kind: "new" })}
          className="h-12 shrink-0 rounded-2xl bg-limon-dark px-4 font-display text-lg font-semibold text-white shadow-[0_3px_0_0_#365807] active:translate-y-0.5 active:shadow-none"
        >
          + Nuevo
        </button>
      </div>

      {/* Promociones (ej. 2 helados por $8.000) */}
      <section aria-label="Promociones" className="mb-4 rounded-3xl bg-white p-3 shadow-card">
        <div className="mb-2 flex items-center justify-between gap-2 px-1">
          <h2 className="font-display text-lg font-semibold text-tamarindo">Promociones</h2>
          <button
            type="button"
            onClick={() => setPromoSheet({ id: null })}
            className="h-10 rounded-xl px-3 text-sm font-bold text-tamarindo"
          >
            + Nueva
          </button>
        </div>
        {promotions.length === 0 ? (
          <p className="px-1 pb-1 text-sm text-ink/70">Sin promociones.</p>
        ) : (
          <ul className="space-y-2">
            {promotions.map((pr) => (
              <li key={pr.id}>
                <button
                  type="button"
                  onClick={() => setPromoSheet({ id: pr.id })}
                  className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left ${pr.is_active ? "bg-chile-soft" : "bg-crema opacity-70"}`}
                >
                  <span aria-hidden className="text-2xl">{pr.category === "helados" ? "🍦" : "🎉"}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-bold text-tamarindo-dark">
                      {pr.name} por {formatCOP(pr.price)}
                    </span>
                    <span className="block text-xs font-bold text-ink/70">
                      {pr.is_active ? "Activa · se ve en el menú" : "Pausada"}
                    </span>
                  </span>
                  <span className="text-sm font-bold text-tamarindo">Editar</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {loadError && (
        <p role="alert" className="mb-4 rounded-2xl bg-chile-soft px-4 py-3 font-bold text-chile-dark">
          {loadError}
        </p>
      )}

      {items.length === 0 && !loadError ? (
        <p className="rounded-3xl bg-white p-6 text-center shadow-card">Aún no hay productos. Crea el primero con “+ Nuevo”.</p>
      ) : (
        <ul className="space-y-3">
          {items.map((p) => {
            const low = p.stock <= p.low_stock_threshold;
            return (
              <li
                key={p.id}
                className={`rounded-3xl bg-white p-3 shadow-card ${!p.is_active ? "opacity-60" : ""}`}
              >
                <button
                  type="button"
                  onClick={() => setEditing({ kind: "edit", id: p.id })}
                  className="flex w-full items-center gap-3 text-left"
                  aria-label={`Editar ${p.name}`}
                >
                  <span className="relative size-14 shrink-0 overflow-hidden rounded-xl bg-arena">
                    {p.image_url ? (
                      <Image src={p.image_url} alt="" width={112} height={112} className="size-full object-cover" />
                    ) : (
                      <CategoryArt category={p.category} className="size-full" />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="truncate font-display text-lg font-semibold text-tamarindo-dark">{p.name}</span>
                      {!p.is_active && (
                        <span className="shrink-0 rounded-full bg-tamarindo-soft px-2 py-0.5 text-xs font-bold">Oculto</span>
                      )}
                    </span>
                    <span className="block text-sm text-ink/70">
                      {formatCOP(p.price)}
                      {p.unit_cost != null && ` · costo ${formatCOP(p.unit_cost)}`}
                    </span>
                  </span>
                  <span aria-hidden className="text-2xl text-tamarindo/40">›</span>
                </button>

                <div className="mt-3 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => quickAdjust(p, -1)}
                    disabled={p.stock <= 0}
                    className="grid size-12 place-items-center rounded-2xl bg-crema text-2xl font-bold text-chile-dark active:scale-90 disabled:opacity-30"
                    aria-label={`Restar 1 a ${p.name}`}
                  >
                    −
                  </button>
                  <div
                    className={`flex h-12 min-w-20 flex-col items-center justify-center rounded-2xl px-3 ${
                      p.stock === 0 ? "bg-chile-dark text-white" : low ? "bg-chile-soft text-chile-dark" : "bg-limon-soft text-limon-dark"
                    }`}
                    aria-live="polite"
                  >
                    <span className="font-display text-xl leading-none font-bold tabular-nums">{p.stock}</span>
                    <span className="text-[10px] font-bold uppercase">
                      {p.stock === 0 ? "Agotado" : low ? "¡Poco!" : "en stock"}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => quickAdjust(p, 1)}
                    className="grid size-12 place-items-center rounded-2xl bg-crema text-2xl font-bold text-limon-dark active:scale-90"
                    aria-label={`Sumar 1 a ${p.name}`}
                  >
                    +
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjustingId(p.id)}
                    className="ml-auto h-12 rounded-2xl bg-mango-soft px-4 font-bold text-tamarindo-dark"
                  >
                    Ajustar
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <Sheet
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing?.kind === "new" ? "Nuevo producto" : "Editar producto"}
      >
        {editing && (
          <ProductForm
            key={editing.kind === "edit" ? editing.id : "new"}
            product={editingProduct}
            nextSortOrder={nextSortOrder}
            onClose={() => setEditing(null)}
          />
        )}
      </Sheet>

      <Sheet
        open={promoSheet !== null}
        onClose={() => setPromoSheet(null)}
        title={promoSheet?.id ? "Editar promoción" : "Nueva promoción"}
      >
        {promoSheet && (
          <PromotionForm
            key={promoSheet.id ?? "new"}
            promotion={promotions.find((p) => p.id === promoSheet.id) ?? null}
            onClose={() => setPromoSheet(null)}
          />
        )}
      </Sheet>

      <Sheet open={adjusting !== null} onClose={() => setAdjustingId(null)} title={adjusting ? `Stock · ${adjusting.name}` : "Stock"}>
        {adjusting && <StockAdjustForm product={adjusting} onClose={() => setAdjustingId(null)} />}
      </Sheet>
    </>
  );
}
